function toggleHint(id) {
  const hint = document.getElementById(id);
  hint.style.display = hint.style.display === "none" ? "block" : "none";
}

function toggleExample() {
  const example = document.getElementById("example");
  example.style.display = example.style.display === "none" ? "block" : "none";
}

function getRandomVerb() {
  const verbs = [
    "be",
    "beat",
    "become",
    "begin",
    "bleed",
    "blow",
    "break",
    "bring",
    "build",
    "burn",
    "burst",
    "buy",
    "catch",
    "choose",
    "come",
    "cost",
    "creep",
    "cut",
    "do",
    "draw",
    "dream",
    "drink",
    "drive",
    "eat",
    "fall",
    "feed",
    "feel",
    "fight",
    "find",
    "fit",
    "fly",
    "forget",
    "forgive",
    "freeze",
    "get",
    "give",
    "go",
    "grow",
    "hang",
    "have",
    "hear",
    "hide",
    "hit",
    "hold",
    "hurt",
    "keep",
    "kneel",
    "know",
    "lay",
    "lead",
    "lean",
    "learn",
    "leave",
    "lend",
    "let",
    "lie",
    "light",
    "lose",
    "make",
    "mean",
    "meet",
    "mistake",
    "pay",
    "prove",
    "put",
    "quit",
    "read",
    "ride",
    "ring",
    "rise",
    "run",
    "say",
    "see",
    "seek",
    "sell",
    "send",
    "set",
    "sew",
    "shake",
    "show",
    "shrink",
    "shut",
    "sing",
    "sink",
    "sit",
    "sleep",
    "slide",
    "sow",
    "speak",
    "spell",
    "spend",
    "spill",
    "spoil",
    "spread",
    "spring",
    "stand",
    "steal",
    "stick",
    "sting",
    "sweep",
    "swell",
    "swim",
    "swing",
    "take",
    "teach",
    "tear",
    "tell",
    "think",
    "throw",
    "understand",
    "wake",
    "wear",
    "weep",
    "wet",
    "win",
    "wind",
    "write",
  ];
  const randomIndex = Math.floor(Math.random() * verbs.length);
  return verbs[randomIndex];
}

function displayRandomVerb() {
  const verb = getRandomVerb();
  const verbElement = document.getElementById("randomVerb");
  verbElement.textContent = `Example verb: ${verb}`;
}

window.onload = displayRandomVerb;
