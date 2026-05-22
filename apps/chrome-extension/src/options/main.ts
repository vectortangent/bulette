const apiKeyInput = document.querySelector<HTMLInputElement>("#apiKey")!;
const baseUrlInput = document.querySelector<HTMLInputElement>("#baseUrl")!;
const defaultModelInput = document.querySelector<HTMLInputElement>("#defaultModel")!;
const statusText = document.querySelector<HTMLElement>("#status")!;

document.querySelector("#save")?.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({
    type: "SET_CONFIG",
    config: {
      apiKey: apiKeyInput.value,
      baseUrl: baseUrlInput.value,
      defaultModel: defaultModelInput.value
    }
  });
  statusText.textContent = "Saved";
});

chrome.runtime.sendMessage({ type: "GET_CONFIG" }).then((response) => {
  if (!response?.ok) {
    return;
  }
  apiKeyInput.value = response.config.apiKey ?? "";
  baseUrlInput.value = response.config.baseUrl ?? "";
  defaultModelInput.value = response.config.defaultModel ?? "";
});
