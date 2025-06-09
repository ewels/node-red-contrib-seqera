/*
 * Shared utility helpers for Seqera Platform Node-RED nodes.
 */

const axios = require("axios");

/**
 * Build HTTP headers for Seqera Platform API calls.
 *
 * The helper always injects the Bearer token stored in the shared
 * `seqera-config` node (if present) and merges any additional headers
 * that you pass via `extraHeaders`.
 *
 * Usage:
 *   const headers = buildHeaders(node, { "Content-Type": "application/json" });
 *
 * @param {object} node - The Node-RED node instance (must reference a seqera-config node).
 * @param {object} [extraHeaders={}] - Optional extra headers to include.
 * @returns {object} The complete headers object.
 */
function buildHeaders(node, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = node.seqeraConfig.credentials.token;
  headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/**
 * Perform an Axios request wrapped in try/catch.
 * Logs failing requests with node.warn and re-throws the error.
 *
 * @param {object} node   – Node-RED node (used for logging).
 * @param {string} method – HTTP method (get, post, put, delete, etc.).
 * @param {string} url    – Request URL.
 * @param {object} [options={}] – Axios request options (headers, data, etc.).
 * @returns {Promise<import("axios").AxiosResponse>}
 */
async function apiCall(node, method, url, options = {}) {
  const optHeaders = options.headers || {};
  const mergedHeaders = { ...buildHeaders(node), ...optHeaders };
  const finalOpts = { ...options, headers: mergedHeaders };
  try {
    return await axios.request({ method, url, ...finalOpts });
  } catch (err) {
    finalOpts.headers["Authorization"] = `Bearer *********`;
    node.warn({
      message: `Seqera API ${method.toUpperCase()} call to ${url} failed`,
      error: err,
      request: { method: method.toUpperCase(), url, ...finalOpts },
    });
    throw err;
  }
}

/**
 * Shared handler for datalink auto-complete HTTP endpoint.
 * Used by both datalink-list and datalink-poll nodes.
 *
 * @param {object} RED - Node-RED runtime
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function handleDatalinkAutoComplete(RED, req, res) {
  try {
    const nodeId = req.params.nodeId;
    const search = req.query.search || "";

    // Try to get the node, but it might not exist yet if this is a new node
    let node = RED.nodes.getNode(nodeId);
    let seqeraConfigId = null;
    let baseUrl = "https://api.cloud.seqera.io";
    let workspaceId = null;

    if (node && node.seqeraConfig) {
      // Node exists and has config
      seqeraConfigId = node.seqeraConfig.id;
      baseUrl = node.seqeraConfig.baseUrl || baseUrl;
      workspaceId = node.seqeraConfig.workspaceId;

      // Check for workspace ID override in the node configuration
      if (node.workspaceIdProp && node.workspaceIdPropType === "str" && node.workspaceIdProp.trim()) {
        workspaceId = node.workspaceIdProp;
      }
    } else {
      // Try to get config ID from request body or query params
      seqeraConfigId = req.query.seqeraConfig || req.body?.seqeraConfig;
      if (seqeraConfigId) {
        const configNode = RED.nodes.getNode(seqeraConfigId);
        if (configNode) {
          baseUrl = configNode.baseUrl || baseUrl;
          workspaceId = configNode.workspaceId;
        }
      }
    }

    // Also check for workspace ID override in query parameters (from frontend)
    if (req.query.workspaceId && req.query.workspaceId.trim()) {
      workspaceId = req.query.workspaceId;
    }

    if (!workspaceId) {
      return res.json([]); // Return empty array instead of error for better UX
    }

    // Create a temporary node-like object for apiCall if we don't have a real node
    const nodeForApi = node || {
      seqeraConfig: RED.nodes.getNode(seqeraConfigId),
      warn: () => {}, // Dummy warn function
    };

    if (!nodeForApi.seqeraConfig) {
      return res.json([]);
    }

    // Build the data-links API URL with search parameter
    const params = new URLSearchParams({ workspaceId });
    if (search) {
      params.append("search", search);
    }
    const dataLinksUrl = `${baseUrl.replace(/\/$/, "")}/data-links?${params.toString()}`;

    const response = await apiCall(nodeForApi, "get", dataLinksUrl, {
      headers: { Accept: "application/json" },
    });

    const dataLinks = response.data?.dataLinks || [];

    const results = dataLinks.map((dataLink) => ({
      value: dataLink.name,
      label: dataLink.name,
    }));

    res.json(results);
  } catch (error) {
    // Return empty array on error for better UX
    res.json([]);
  }
}

module.exports = { buildHeaders, apiCall, handleDatalinkAutoComplete };
