function insertSymbol(symbol) {
  const inputField = document.getElementById("inputField");
  inputField.value += symbol;
}

function addSpace() {
  const inputField = document.getElementById("inputField");
  inputField.value += " ";
}

function backspace() {
  const inputField = document.getElementById("inputField");
  inputField.value = inputField.value.slice(0, -1);
}

function clearInput() {
  const inputField = document.getElementById("inputField");
  inputField.value = "";
}
