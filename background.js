chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  let isLoaded = "complete" === changeInfo.status;
  let isAmazonOrder = /amazon\.com.+progress-tracker\/package/.test(tab.url);
  if (isLoaded && isAmazonOrder) {
    chrome.scripting.executeScript({
      target: { tabId : tabId },
      files: ["./script.js"]
    })
      .then(() => console.log("Successfully injected!"))
      .catch(err => console.log(err));
  }
});