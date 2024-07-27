const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { encrypt, decrypt } = require("./utils/cryptoUtils");
const { generateTOTP } = require("./utils/otpUtils");

let mainWindow;
let otpEntries = [];
let masterPassword;

if ( process.env.NODE_ENV != 'production') { 
    require('electron-reload')(__dirname, { 
        electron: path.join(__dirname, '..','node_modules', '.bin', 'electron'), 
        hardResetMethod: 'exit'
    }); 
} 

const filePath = path.join(app.getPath("userData"), "otpEntries.json");

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "assets", "icon.png"),
  });

  mainWindow.loadFile("views/index.html");

  mainWindow.webContents.on("did-finish-load", () => {
    requestMasterPassword();
  });
}

function createPasswordPrompt() {
    let passwordPrompt = new BrowserWindow({
      width: 350,
      height: 320,
      modal: true,
      parent: mainWindow,
      title: "Master Password",
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });
  
    passwordPrompt.loadFile("views/passwordPrompt.html");
  
    return new Promise((resolve, reject) => {
      const handlePasswordSubmit = (event, password) => {
        if (password) {
          resolve(password);
          passwordPrompt.removeListener('close', handleWindowClose);
          passwordPrompt.close();
        } else {
          // If password is not provided, reject the promise and reopen the dialog
          passwordPrompt.removeListener('close', handleWindowClose);
          reject(new Error('Password not provided'));
        }
      };
  
      const handleWindowClose = () => {
        // Reopen the prompt if user closes the window without providing password
        reject(new Error('Password prompt closed without providing password'));
      };
  
      ipcMain.once("submit-password", handlePasswordSubmit);
      passwordPrompt.on('close', handleWindowClose);
    });
  }

  async function requestMasterPassword() {
    while (true) {
      try {
        masterPassword = await createPasswordPrompt();
        try {
          loadOtpEntries(); // This function should use the decrypted data
          break; // Exit loop if password is successfully used
        } catch (error) {
          // Handle decryption failure
          console.error('Error loading OTP entries:', error.message);
          dialog.showErrorBox('Decryption Error', 'The master password is incorrect or the data is corrupted. Please try again.');
        }
      } catch (error) {
        console.error('Error obtaining master password:', error.message);
        dialog.showErrorBox('Error', 'Master password is required to proceed. Please try again.');
      }
    }
  }

function loadOtpEntries() {
  if (fs.existsSync(filePath)) {
    const encryptedData = fs.readFileSync(filePath, "utf8");
    try {
      const decryptedData = decrypt(encryptedData, masterPassword);
      otpEntries = JSON.parse(decryptedData);
      mainWindow.webContents.send("otp-entries", otpEntries);
    } catch (error) {
      dialog.showErrorBox("Error", "Invalid master password");
      requestMasterPassword();
    }
  } else {
    saveOtpEntries([]);
  }
}

function saveOtpEntries(entries) {
  const encryptedData = encrypt(JSON.stringify(entries), masterPassword);
  fs.writeFileSync(filePath, encryptedData, "utf8");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on("app-quit", (event, entry) => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});


ipcMain.on("add-otp-entry", (event, entry) => {
  otpEntries.push(entry);
  mainWindow.webContents.send("otp-entries", otpEntries);
  saveOtpEntries(otpEntries);
});

ipcMain.on("delete-otp-entry", (event, domain) => {
  otpEntries = otpEntries.filter((entry) => entry.domain !== domain);
  mainWindow.webContents.send("otp-entries", otpEntries);
  saveOtpEntries(otpEntries);
});

ipcMain.on("get-otp-code", (event, domain) => {
  try {
    const storedEntry = otpEntries.find((entry) => entry.domain === domain);
    if (storedEntry) {
      const token = generateTOTP(storedEntry.secret);
      mainWindow.webContents.send("otp-code", token);
    } else {
      mainWindow.webContents.send("otp-code", "OTP entry not found");
    }
  } catch (error) {
    console.error("Error generating OTP code:", error);
    mainWindow.webContents.send("otp-code", "Error generating OTP code");
  }
});
