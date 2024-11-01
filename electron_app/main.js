const log = require('electron-log');
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const axios = require('axios'); // Ensure axios is installed: npm install axios

let shinyProcess;
let mainWindow;
let shinyPort;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: path.join(__dirname, 'icon.icns'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${shinyPort}/`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function waitForShinyServer(port, retries = 20, delay = 500) {
  return new Promise((resolve, reject) => {
    const attempt = (currentRetry) => {
      axios.get(`http://localhost:${port}/`)
        .then(() => resolve())
        .catch((err) => {
          if (currentRetry <= 0) {
            reject(new Error('Shiny server did not start in time.'));
          } else {
            setTimeout(() => attempt(currentRetry - 1), delay);
          }
        });
    };
    attempt(retries);
  });
}

function handleShinyOutput(data) {
  const output = data.toString().trim();
  log.info(`Shiny output: ${output}`);

  // Look for the "Selected port" message
  const portMatch = output.match(/Selected port: (\d+)/);
  if (portMatch) {
    shinyPort = portMatch[1];
    log.info(`Selected port: ${shinyPort}`);
  }

  // Look for the "Listening on" message
  const listeningMatch = output.match(/Listening on (http:\/\/127\.0\.0\.1:\d+)/);
  if (listeningMatch) {
    log.info(`Shiny app is fully running on port ${shinyPort}`);
    
    // Wait for the Shiny server to be ready before creating the window
    waitForShinyServer(shinyPort)
      .then(() => {
        log.info(`Shiny server is up on port ${shinyPort}. Creating window.`);
        createWindow();
      })
      .catch((err) => {
        log.error(err.message);
        app.quit();
      });
  }
}

function startShinyApp() {
  let basePath;
  if (app.isPackaged) {
    basePath = path.join(process.resourcesPath, 'app.asar.unpacked');
  } else {
    basePath = __dirname;
  }

  // Add comprehensive logging
  log.info(`Base path: ${basePath}`);
  log.info(`Contents of base path: ${fs.readdirSync(basePath)}`);
  
  const rBinaryPath = path.join(basePath, 'R', 'R.framework', 'Resources', 'bin', 'Rscript');
  
  log.info(`Attempting to use R binary at: ${rBinaryPath}`);
  log.info(`R binary exists: ${fs.existsSync(rBinaryPath)}`);

  
  const rScriptPath = path.join(basePath, 'launch_app.R');

  // Check if Rscript exists
  if (!fs.existsSync(rBinaryPath)) {
    log.error(`Rscript not found at ${rBinaryPath}`);
    app.quit();
    return;
  }

  if (!fs.existsSync(rScriptPath)) {
    log.error(`launch_app.R not found at ${rScriptPath}`);
    app.quit();
    return;
  }

  // Start the Shiny app
  log.info(`Starting Shiny app with command: "${rBinaryPath}" "${rScriptPath}"`);

  shinyProcess = spawn(rBinaryPath, [rScriptPath]);

  // Listen to stdout
  shinyProcess.stdout.on('data', (data) => {
    handleShinyOutput(data);
  });

  // Listen to stderr
  shinyProcess.stderr.on('data', (data) => {
    handleShinyOutput(data);
  });

  shinyProcess.on('close', (code) => {
    log.info(`Shiny process exited with code ${code}`);
    // If the Shiny app closes, quit the Electron app
    app.quit();
  });
}

app.whenReady().then(() => {
  log.info('Electron app is ready.');
  startShinyApp();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0 && shinyPort) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Terminate the Shiny process when all windows are closed
  if (shinyProcess) {
    shinyProcess.kill();
    shinyProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
