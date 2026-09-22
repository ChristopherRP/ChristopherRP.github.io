const chatBody = document.getElementById("chatBody");

const chatMessages = [
  { text: "Hola, cari\u00f1o", typing: 1400, pause: 900 },
  { text: "Te tengo un regalo virtual", typing: 1300, pause: 800 },
  { text: "Flores amarillas, para ti", typing: 1300, pause: 800 },
  { text: "Cierra los ojos y abre el sobre", typing: 1500, pause: 0 }
];

const cardMessage =
  "Para mi cari\u00f1o:\n\n" +
  "Las flores amarillas son para ti. Así como el sol hace crecer " +
  "los girasoles, tú haces brillar mis días.\n\n" +
  "Este pequeño regalo virtual es un pedacito de mi cariño para ti.\n\n" +
  "Con todo mi amor.";

const finalMessage =
  "Flores amarillas para ti, cariño. Te quiero muchísimo.";

const music = document.getElementById("music");
const musicToggle = document.getElementById("musicToggle");
const startScreen = document.getElementById("start");
let musicOn = false;

function playMusic() {
  music.volume = 0.5;
  const p = music.play();
  if (p && p.then) {
    p.then(() => {
      musicOn = true;
      musicToggle.classList.add("on");
      musicToggle.classList.remove("off");
    }).catch(() => {});
  }
}

function stopMusic() {
  music.pause();
  music.currentTime = 0;
  musicOn = false;
  musicToggle.classList.remove("on");
  musicToggle.classList.add("off");
}

function toggleMusic() {
  if (!musicOn) {
    playMusic();
  } else {
    stopMusic();
  }
}

musicToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleMusic();
});

startScreen.addEventListener("pointerdown", () => {
  playMusic();
  startScreen.classList.add("hidden");
  runChat();
});

window.addEventListener("pointerdown", () => {
  playMusic();
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function clockTime() {
  const d = new Date();
  let h = d.getHours();
  const period = h >= 12 ? " PM" : " AM";
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")}${period}`;
}

function bubbleEl(text) {
  const el = document.createElement("div");
  el.className = "msg msg--in";
  el.innerHTML = `${text}<small>${clockTime()}</small>`;
  return el;
}

function typingEl() {
  const el = document.createElement("div");
  el.className = "msg msg--in typing";
  el.innerHTML = "<span></span><span></span><span></span>";
  return el;
}

function buttonEl() {
  const el = document.createElement("div");
  el.className = "msg msg--btn";
  const btn = document.createElement("button");
  btn.className = "gift-open-btn";
  btn.textContent = "Abrir regalo";
  btn.addEventListener("click", openGift);
  el.appendChild(btn);
  return el;
}

async function runChat() {
  for (const m of chatMessages) {
    const tip = typingEl();
    chatBody.appendChild(tip);
    await sleep(m.typing);
    tip.remove();
    chatBody.appendChild(bubbleEl(m.text));
    await sleep(m.pause);
  }
  const tip = typingEl();
  chatBody.appendChild(tip);
  await sleep(1500);
  tip.remove();
  await sleep(350);
  chatBody.appendChild(buttonEl());
  await sleep(600);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
}

function openGift() {
  playMusic();
  document.getElementById("chat").classList.add("hidden");
  document.getElementById("gift").classList.remove("hidden");
  initGift();
}

/* ---------------- FASE 2: CARTA ---------------- */
function initGift() {
  const envelope = document.getElementById("envelope");
  const hint = document.getElementById("giftHint");
  const cardText = document.getElementById("cardText");
  const continueBtn = document.getElementById("continueBtn");
  continueBtn.style.display = "none";

  let opened = false;

  envelope.addEventListener("click", async () => {
    if (opened) return;
    opened = true;
    hint.style.display = "none";
    envelope.classList.add("open");
    await sleep(1100);

    let i = 0;
    cardText.textContent = "";
    const interval = setInterval(() => {
      cardText.textContent += cardMessage.charAt(i);
      i++;
      if (i >= cardMessage.length) {
        clearInterval(interval);
        continueBtn.style.display = "block";
      }
    }, 18);
  });

  continueBtn.addEventListener("click", goFlowers);
}

function goFlowers() {
  playMusic();
  document.getElementById("gift").classList.add("hidden");
  const flowers = document.getElementById("flowers");
  flowers.classList.remove("hidden");
  initFlowers();
}

/* ---------------- FASE 3: GIRASOLES ---------------- */
function initFlowers() {
  const finalEl = document.getElementById("finalMessage");
  const msg = document.querySelector("#flowers .message");

  setTimeout(() => {
    let i = 0;
    finalEl.textContent = "";
    const interval = setInterval(() => {
      finalEl.textContent += finalMessage.charAt(i);
      i++;
      if (i >= finalMessage.length) {
        clearInterval(interval);
        setTimeout(() => msg.classList.add("typing-done"), 3000);
      }
    }, 75);
  }, 2600);
}