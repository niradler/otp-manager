const { ipcRenderer } = require("electron");

document.getElementById("otpForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const domain = document.getElementById("domain").value;
  const username = document.getElementById("username").value;
  const secret = document.getElementById("secret").value;

  ipcRenderer.send("add-otp-entry", { domain, username, secret });

  document.getElementById("otpForm").reset();
});

// Function to handle OTP code retrieval
function showOtpCode(domain) {
  ipcRenderer.send("get-otp-code", domain);
}

// Listening for OTP code from the main process
ipcRenderer.on("otp-code", (event, otpCode) => {
  if (otpCode.startsWith("Error")) {
    alert(otpCode);
  } else {
    alert(`Your OTP code is: ${otpCode}`);
  }
});

ipcRenderer.on("otp-entries", (event, entries) => {
  const otpList = document.getElementById("otpList");
  otpList.innerHTML = ""; // Clear existing list items

  entries.forEach((entry) => {
    const listItem = document.createElement("li");
    listItem.className =
      "list-group-item d-flex justify-content-between align-items-center";
    listItem.textContent = `${entry.domain} (${entry.username})`;

    // Create button container to align buttons using Bootstrap
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "btn-group btn-group-sm";

    // Create show button
    const showButton = document.createElement("button");
    showButton.textContent = "Generate";
    showButton.className = "btn btn-primary"; // Bootstrap classes for styling
    showButton.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent triggering list item click event
      ipcRenderer.send("get-otp-code", entry.domain); // Request OTP code
    });

    // Create delete button
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "btn btn-danger"; // Bootstrap classes for styling
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent triggering list item click event
      ipcRenderer.send("delete-otp-entry", entry.domain);
    });

    // Append buttons to button container
    buttonContainer.appendChild(showButton);
    buttonContainer.appendChild(deleteButton);

    // Append button container to list item
    listItem.appendChild(buttonContainer);
    
    // Append list item to the list
    otpList.appendChild(listItem);
  });
});
