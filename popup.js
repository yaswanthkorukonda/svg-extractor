let svgs = [];
let selectedSVG = "";

function renderSVGList() {
  const list = document.getElementById("svg-list");
  list.innerHTML = "";
  if (svgs.length === 0) {
    list.innerHTML = "<p>No SVGs Found in this page</p>";
  } else {
    svgs.forEach((svg, idx) => {
      const div = document.createElement("div");
      div.className = "svg-thumb";
      div.innerHTML = svg;
      div.onclick = () => showOptions(idx);
      list.appendChild(div);
    });
  }
}

function showOptions(idx) {
  selectedSVG = svgs[idx];
  document.getElementById("svg-list").style.display = "none";
  document.getElementById("options").style.display = "block";
  document.getElementById("svg-preview").innerHTML = selectedSVG;
}

function backToList() {
  document.getElementById("options").style.display = "none";
  document.getElementById("svg-list").style.display = "flex";
}

function download(type) {
  if (!selectedSVG) return;

  const inputName = document.getElementById('filename-input').value.trim();
  const timestamp = Date.now();
  const baseName = inputName !== '' ? inputName : `svg-${timestamp}`;

  if (type === 'svg') {
    const blob = new Blob([selectedSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: `${baseName}.svg` }, () => {
      URL.revokeObjectURL(url);
    });
    return;
  }

  // PNG or JPG
  const parser = new DOMParser();
  const doc = parser.parseFromString(selectedSVG, "image/svg+xml");
  const svgEl = doc.querySelector('svg');

  if (!svgEl) {
    alert('Invalid SVG code.');
    return;
  }

  let width = parseInt(svgEl.getAttribute('width')) || 256;
  let height = parseInt(svgEl.getAttribute('height')) || 256;

  if ((!width || !height) && svgEl.hasAttribute('viewBox')) {
    const vb = svgEl.getAttribute('viewBox').split(' ');
    width = parseInt(vb[2]) || width;
    height = parseInt(vb[3]) || height;
  }

  svgEl.setAttribute('width', width);
  svgEl.setAttribute('height', height);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgEl);
  const svg64 = btoa(unescape(encodeURIComponent(svgString)));

  const img = new Image();
  img.onload = function () {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(blob => {
      if (!blob) {
        alert('Failed to render SVG for download.');
        return;
      }
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({ url, filename: `${baseName}.${type}` }, () => {
        URL.revokeObjectURL(url);
      });
    }, type === 'png' ? 'image/png' : 'image/jpeg');
  };

  img.onerror = function () {
    alert('Failed to render SVG for download.');
  };

  img.src = 'data:image/svg+xml;base64,' + svg64;
}


document.getElementById("download-svg").onclick = () => download("svg");
document.getElementById("download-png").onclick = () => download("png");
document.getElementById("download-jpg").onclick = () => download("jpg");
document.getElementById("back").onclick = backToList;

// Paste HTML/SVG logic
document.getElementById("show-paste-box").onclick = () => {
  document.getElementById("paste-box").style.display = "block";
  document.getElementById("show-paste-box").style.display = "none";
};

document.getElementById("preview-paste").onclick = () => {
  const code = document.getElementById("paste-input").value;
  // Try to extract <svg>...</svg> if HTML, else use as is
  let match = code.match(/<svg[\s\S]*?<\/svg>/i);
  let svg = match ? match[0] : code;
  if (!svg.trim().startsWith("<svg")) {
    alert("No SVG found in the pasted code.");
    return;
  }
  selectedSVG = svg;
  document.getElementById("svg-list").style.display = "none";
  document.getElementById("options").style.display = "block";
  document.getElementById("svg-preview").innerHTML = selectedSVG;
};

// Inject content script to get SVGs from the page
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabs[0].id },
      func: () =>
        Array.from(document.querySelectorAll("svg")).map(
          (svg) => svg.outerHTML
        ),
    },
    (results) => {
      svgs = results[0].result;
      renderSVGList();
    }
  );
});
