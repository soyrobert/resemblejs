const resemble = require('resemblejs');
const fs = require('fs');
const path = require('path');

const options = {
  "output": {
      "errorColor": {
          "red": 255,
          "green": 0,
          "blue": 255
      },
      "errorType": "movement",
      "transparency": 0.3,
      "largeImageThreshold": 1200,
      "useCrossOrigin": false,
      "outputDiff": true
  },
  "scaleToSameSize": true,
  "ignore": "antialiasing"
};
resemble.outputSettings(options.output);

const threshold = 50; // Umbral de porcentaje de desajuste

// Función para obtener directorios
const getDirectories = (source) =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

// Función para obtener imágenes PNG de una carpeta
const getImages = (source) =>
  fs.readdirSync(source)
    .filter(file => file.endsWith('.png'));

// Función de comparación de imágenes que devuelve una promesa
const compareImages = (image1, image2, diffImageName) => {
  return new Promise((resolve, reject) => {
    resemble(image1)
      .compareTo(image2)
      .ignoreAntialiasing()
      .scaleToSameSize()
      .onComplete((data) => {
        if (parseFloat(data.misMatchPercentage) >= threshold) {
          const diffImagePath = path.join('./reports', diffImageName);
          fs.writeFileSync(diffImagePath, data.getBuffer());
          resolve({ data, diffImagePath });
        } else {
          resolve(null);
        }
      });
  });
};

// Función principal para procesar versiones y escenarios
const processVersionsAndScenarios = async () => {
  let reportHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8">
  <title>Image Comparison Report</title>
  <style>
    body { margin: 0; padding: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: center; }
    th { background-color: #4CAF50; color: white; }
    td { background-color: #f2f2f2; }
    .image-container { padding: 5px; }
    img { max-width: 300px; height: auto; }
    .scenario-header { background-color: #f7f7f7; padding: 20px; font-size: 20px; text-align: left; margin-top: 20px; }
  </style>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
  </head>
  <body>
  <h1>Image Comparison Report</h1>
  `;

  const versions = getDirectories('.');

  for (let i = 0; i < versions.length - 1; i++) {
    const version1 = versions[i];
    const version2 = versions[i + 1];
    const scenarios = getDirectories(version1);

    for (const scenario of scenarios) {
      if (!fs.existsSync(path.join(version2, scenario))) {
        continue; // Si el escenario no existe en ambas versiones, lo omite
      }

      const imagesVersion1 = getImages(path.join(version1, scenario));
      const imagesVersion2 = getImages(path.join(version2, scenario));

      reportHtml += `<div class="scenario-header">Scenario: ${scenario}</div>`;

      for (let j = 0; j < imagesVersion1.length; j++) {
        const image1Path = path.join(version1, scenario, imagesVersion1[j]);
        const image2Path = path.join(version2, scenario, imagesVersion2[j]);
        const diffImageName = `${scenario}_${imagesVersion1[j].replace('.png', '')}_diff.png`;

        const result = await compareImages(image1Path, image2Path, diffImageName);
        if (result) {
          reportHtml += `
          <table>
            <tr>
              <th>${version1} Image</th>
              <th>${version2} Image</th>
              <th>Diff Image</th>
              <th>Mismatch%</th>
            </tr>
            <tr>
              <td class="image-container"><img src="../${image1Path}" alt="${version1} Image"/></td>
              <td class="image-container"><img src="../${image2Path}" alt="${version2} Image"/></td>
              <td class="image-container"><img src="../${result.diffImagePath}" alt="Diff Image"/></td>
              <td>${result.data.misMatchPercentage}</td>
            </tr>
          </table>
          `;
        }
      }
    }
  }

  reportHtml += `
  </body>
  </html>
  `;

  fs.writeFileSync('./reports/report.html', reportHtml);
};

processVersionsAndScenarios();
