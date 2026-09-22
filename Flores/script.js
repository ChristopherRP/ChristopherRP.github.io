const messageText = "Las flores amarillas simbolizan la felicidad. T\u00fa eres la m\u00eda. \uD83D\uDC9B";
const messageEl = document.getElementById("messageText");

function typeMessage(text, el, startDelay, speed) {
  setTimeout(() => {
    let i = 0;
    el.textContent = "";
    const interval = setInterval(() => {
      el.textContent += text.charAt(i);
      i++;
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, speed);
  }, startDelay);
}

typeMessage(messageText, messageEl, 2600, 70);