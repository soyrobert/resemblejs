const resemble = require('resemblejs');
const fs = require('fs');
const path = require('path');

const compareImages = (image1, image2, diffImageName, callback) => {
  resemble(image1)
    .compareTo(image2)
    .onComplete((data) => {
      const diffImagePath = path.join('./reports', diffImageName);
      fs.writeFileSync(diffImagePath, data.getBuffer());
      callback(diffImagePath);
    });
};

const getDirectories = (source) =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

const getImages = (source) =>
  fs.readdirSync(source)
    .filter(file => file.endsWith('.png'));

const versions = ['Version1', 'Version2'];

let reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Image Comparison Report</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
  table { width: 100%; }
  th, td { padding: 10px; text-align: center; }
  th { background-color: #4CAF50; color: white; }
  td { background-color: #f2f2f2; }
  .image-container { padding: 5px; }
  img { max-width: 300px; height: auto; }
</style>
</head>
<body>
<h1>Image Comparison Report</h1>
<table>
<tr><th>Version 1 Image</th><th>Version 2 Image</th><th>Diff Image</th></tr>
`;


fs.mkdirSync('./reports', { recursive: true });

versions.forEach((version, index, array) => {
  if (index < array.length - 1) {
    const nextVersion = array[index + 1];
    const scenarios = getDirectories(version);

    scenarios.forEach((scenario) => {
      const scenarioPath = path.join(version, scenario);
      const nextScenarioPath = path.join(nextVersion, scenario);
      const images = getImages(scenarioPath);

      images.forEach((image) => {
        const image1Path = path.join('../', scenarioPath, image);
        const image2Path = path.join('../', nextScenarioPath, image);
        const diffImageName = `${scenario}_${image.replace('.png', '')}_diff.png`;

        compareImages(path.join(scenarioPath, image), path.join(nextScenarioPath, image), diffImageName, (diffImagePath) => {
          diffImagePath = path.join('../', diffImagePath);
          reportHtml += `
<tr>
  <td class="image-container"><img src="${image1Path}" alt="Version 1 Image"/></td>
  <td class="image-container"><img src="${image2Path}" alt="Version 2 Image"/></td>
  <td class="image-container"><img src="${diffImagePath}" alt="Diff Image"/></td>
</tr>
`;
          
          if (scenario === scenarios[scenarios.length - 1] && image === images[images.length - 1]) {
            reportHtml += `
</table>
</body>
</html>
`;
            fs.writeFileSync('./reports/report.html', reportHtml);
          }
        });
      });
    });
  }
});
