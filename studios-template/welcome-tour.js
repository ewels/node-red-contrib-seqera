/**
 * Seqera Node-RED Welcome Tour
 * Simple welcome popup for first-time users
 */

(function () {
  "use strict";

  // Storage key for tracking if welcome has been shown
  const WELCOME_SHOWN_KEY = "seqera-welcome-shown";

  // Check if welcome has already been shown
  function hasWelcomeBeenShown() {
    return localStorage.getItem(WELCOME_SHOWN_KEY) === "true";
  }

  // Mark welcome as shown
  function markWelcomeAsShown() {
    localStorage.setItem(WELCOME_SHOWN_KEY, "true");
  }

  // Create welcome modal HTML
  function createWelcomeModal() {
    const modalHTML = `
            <div id="seqera-welcome-backdrop" class="seqera-welcome-backdrop">
                <div class="seqera-welcome-modal">
                    <div class="seqera-welcome-header">
                        <img src="/node-red-data/node-red-seqera.svg" alt="Seqera" class="seqera-welcome-logo">
                        <h2>Welcome to Node-RED + Seqera</h2>
                    </div>
                    <div class="seqera-welcome-content">
                        <p>Welcome to your Node-RED development environment powered by Seqera Platform Studios!</p>
                        <p>You're now ready to build powerful data workflows and automation using the visual programming interface of Node-RED.</p>
                        <ul>
                            <li>Drag nodes from the palette on the left</li>
                            <li>Connect them to create flows</li>
                            <li>Use the Seqera nodes for platform integration</li>
                            <li>Deploy your flows to start processing</li>
                        </ul>
                        <p>Happy building! 🚀</p>
                    </div>
                    <div class="seqera-welcome-footer">
                        <button id="seqera-welcome-dismiss" class="seqera-welcome-button">Get Started</button>
                    </div>
                </div>
            </div>
        `;

    // Insert modal into document
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Add event listener for dismiss button
    const dismissButton = document.getElementById("seqera-welcome-dismiss");
    const backdrop = document.getElementById("seqera-welcome-backdrop");

    if (dismissButton && backdrop) {
      dismissButton.addEventListener("click", function () {
        markWelcomeAsShown();
        backdrop.remove();
      });

      // Allow clicking backdrop to dismiss
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop) {
          markWelcomeAsShown();
          backdrop.remove();
        }
      });
    }
  }

  // Wait for Node-RED editor to be ready
  function waitForNodeRED() {
    // Check if RED object is available (Node-RED's main object)
    if (typeof RED !== "undefined" && RED.editor) {
      // Wait a bit more for editor to fully initialize
      setTimeout(showWelcomeIfNeeded, 1000);
      console.log("PHIL WROTE THIS Node-RED editor is ready");
    } else {
      // Check again in 100ms
      setTimeout(waitForNodeRED, 100);
    }
  }

  // Show welcome modal if it hasn't been shown before
  function showWelcomeIfNeeded() {
    if (!hasWelcomeBeenShown()) {
      createWelcomeModal();
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForNodeRED);
  } else {
    waitForNodeRED();
  }
})();
