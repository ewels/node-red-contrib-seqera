module.exports = function (RED) {
  function SeqeraStudiosMonitorNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // --- Store typedInput properties
    node.studioIdProp = config.studioId;
    node.studioIdPropType = config.studioIdType;
    node.workspaceIdProp = config.workspaceId;
    node.workspaceIdPropType = config.workspaceIdType;
    node.pollIntervalProp = config.poll;
    node.pollIntervalPropType = config.pollType;
    node.keepPolling = config.keepPolling !== false; // default true

    // Shared Seqera config
    node.seqeraConfig = RED.nodes.getNode(config.seqera);
    node.defaultBaseUrl = (node.seqeraConfig && node.seqeraConfig.baseUrl) || "https://api.cloud.seqera.io";

    // Legacy per-node credentials support
    node.credentials = RED.nodes.getCredentials(node.id);

    const { apiCall } = require("./_utils");

    // Format time helper
    const formatDateTime = () => {
      const d = new Date();
      const pad = (n) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${d.toLocaleTimeString()}`;
    };

    let intervalId = null;

    const clearPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    node.on("close", clearPolling);

    // Evaluate typedInput helper (supports JSONata)
    const evalProp = async (p, t, msg) => {
      if (t === "jsonata") {
        const expr = RED.util.prepareJSONataExpression(p, node);
        return new Promise((resolve, reject) => {
          RED.util.evaluateJSONataExpression(expr, msg, (err, v) => {
            if (err) return reject(err);
            resolve(v);
          });
        });
      }
      return RED.util.evaluateNodeProperty(p, t, node, msg);
    };

    // Status-colour mapping
    const mapColor = (s) => {
      const stat = (s || "").toLowerCase();
      if (/^(starting|building|stopping)$/.test(stat)) return "yellow";
      if (/^(running)$/.test(stat)) return "blue";
      if (/^(stopped)$/.test(stat)) return "green";
      if (/^(errored|buildfailed)$/.test(stat)) return "red";
      return "grey";
    };

    async function fetchStatus(msg, send) {
      try {
        // Evaluate dynamic props each poll so they can change via msg
        const studioId = await evalProp(node.studioIdProp, node.studioIdPropType, msg);
        const workspaceIdOverride = await evalProp(node.workspaceIdProp, node.workspaceIdPropType, msg);
        const pollIntervalVal = await evalProp(node.pollIntervalProp, node.pollIntervalPropType, msg);

        if (!studioId) throw new Error("studioId not provided");

        const baseUrl = (node.seqeraConfig && node.seqeraConfig.baseUrl) || node.defaultBaseUrl;
        const workspaceId =
          workspaceIdOverride || (node.seqeraConfig && node.seqeraConfig.workspaceId) || msg.workspaceId || null;

        const urlBase = `${baseUrl.replace(/\/$/, "")}/studios/${studioId}`;
        const url = workspaceId ? `${urlBase}?workspaceId=${workspaceId}` : urlBase;

        const response = await apiCall(node, "get", url, { headers: { Accept: "application/json" } });
        const studioStatus = response.data?.statusInfo?.status || "unknown";
        const statusLower = studioStatus.toLowerCase();

        node.status({
          fill: mapColor(statusLower),
          shape: /^(starting|running|building|stopping)$/.test(statusLower) ? "ring" : "dot",
          text: `${statusLower}: ${formatDateTime()}`,
        });

        const outMsg = {
          ...msg,
          payload: response.data,
          studioId: response.data?.sessionId || studioId,
        };

        if (/^(starting|running|building|stopping)$/.test(statusLower)) {
          send([outMsg, null, null]);
        } else if (/^(stopped)$/.test(statusLower)) {
          send([null, outMsg, null]);
        } else {
          send([null, null, outMsg]);
        }

        // Determine if we should continue polling
        if (!node.keepPolling || !/^(starting|running|building|stopping)$/.test(statusLower)) {
          clearPolling();
        }

        // Adjust poll interval dynamically if value changed
        if (node.keepPolling && /^(starting|running|building|stopping)$/.test(statusLower)) {
          const pollSec = parseInt(pollIntervalVal, 10) || 5;
          if (pollSec * 1000 !== node._currentPollMs) {
            clearPolling();
            node._currentPollMs = pollSec * 1000;
            intervalId = setInterval(() => fetchStatus(msg, send), node._currentPollMs);
          }
        }
      } catch (err) {
        node.error(`Seqera API request failed: ${err.message}`, msg);
        node.status({ fill: "red", shape: "dot", text: `error: ${formatDateTime()}` });
        clearPolling();
      }
    }

    node.on("input", async function (msg, send, done) {
      clearPolling();
      try {
        await fetchStatus(msg, send);

        if (node.keepPolling && !intervalId) {
          const pollIntervalVal = await evalProp(node.pollIntervalProp, node.pollIntervalPropType, msg);
          const pollSec = parseInt(pollIntervalVal, 10) || 5;
          node._currentPollMs = pollSec * 1000;
          intervalId = setInterval(() => fetchStatus(msg, send), node._currentPollMs);
        }
        if (done) done();
      } catch (err) {
        if (done) done(err);
      }
    });
  }

  RED.nodes.registerType("seqera-studios-monitor", SeqeraStudiosMonitorNode, {
    credentials: {
      token: { type: "password" },
    },
    defaults: {
      name: { value: "" },
      seqeraConfig: { value: "", type: "seqera-config", required: true },
      studioId: { value: "studioId" },
      studioIdType: { value: "msg" },
      workspaceId: { value: "workspaceId" },
      workspaceIdType: { value: "msg" },
      keepPolling: { value: true },
      poll: { value: 5 },
      pollType: { value: "num" },
    },
  });
};