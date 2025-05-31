var svgs = [];
var selectedSVG = "";

function renderSVGList() {
  var list = document.getElementById("svg-list");
  list.innerHTML = "";

  if (svgs.length === 0) {
    list.innerHTML = "<p>No SVGs Found in this page</p>";
  } else {
    for (var i = 0; i < svgs.length; i++) {
      var div = document.createElement("div");
      div.className = "svg-thumb";
      div.innerHTML = svgs[i];
      div.onclick = function(index) {
        return function () {
          showOptions(index);
        };
      }(i);
      list.appendChild(div);
    }
  }
}

function showOptions(index) {
  selectedSVG = svgs[index];
  document.getElementById("svg-list").style.display = "none";
  document.getElementById("options").style.display = "block";
  document.getElementById("svg-preview").innerHTML = selectedSVG;
}

function backToList() {
  document.getElementById("options").style.display = "none";
  document.getElementById("svg-list").style.display = "flex";
}

function download(type) {
  if (selectedSVG == "") {
    return;
  }

  var inputName = document.getElementById("filename-input").value.trim();
  var timestamp = Date.now();
  var baseName = inputName != "" ? inputName : "svg-" + timestamp;

  if (type == "svg") {
    var blob = new Blob([selectedSVG], { type: "image/svg+xml" });
    var url = URL.createObjectURL(blob);
    chrome.downloads.download({ url: url, filename: baseName + ".svg" }, function () {
      URL.revokeObjectURL(url);
    });
    return;
  }

  var parser = new DOMParser();
  var doc = parser.parseFromString(selectedSVG, "image/svg+xml");
  var svgEl = doc.querySelector("svg");

  if (!svgEl) {
    alert("Invalid SVG code.");
    return;
  }

  var width = parseInt(svgEl.getAttribute("width")) || 256;
  var height = parseInt(svgEl.getAttribute("height")) || 256;

  if ((!width || !height) && svgEl.hasAttribute("viewBox")) {
    var vb = svgEl.getAttribute("viewBox").split(" ");
    width = parseInt(vb[2]) || width;
    height = parseInt(vb[3]) || height;
  }

  svgEl.setAttribute("width", width);
  svgEl.setAttribute("height", height);

  var serializer = new XMLSerializer();
  var svgString = serializer.serializeToString(svgEl);
  var svg64 = btoa(unescape(encodeURIComponent(svgString)));

  var img = new Image();
  img.onload = function () {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(function (blob) {
      if (!blob) {
        alert("Failed to render SVG for download.");
        return;
      }
      var url = URL.createObjectURL(blob);
      chrome.downloads.download({ url: url, filename: baseName + "." + type }, function () {
        URL.revokeObjectURL(url);
      });
    }, type == "png" ? "image/png" : "image/jpeg");
  };

  img.onerror = function () {
    alert("Failed to render SVG for download.");
  };

  img.src = "data:image/svg+xml;base64," + svg64;
}

document.getElementById("download-svg").onclick = function () {
  download("svg");
};
document.getElementById("download-png").onclick = function () {
  download("png");
};
document.getElementById("download-jpg").onclick = function () {
  download("jpg");
};
document.getElementById("back").onclick = backToList;

document.getElementById("show-paste-box").onclick = function () {
  document.getElementById("paste-box").style.display = "block";
  document.getElementById("show-paste-box").style.display = "none";
};

document.getElementById("preview-paste").onclick = function () {
  var code = document.getElementById("paste-input").value;
  var match = code.match(/<svg[\s\S]*?<\/svg>/i);
  var svg = match ? match[0] : code;

  if (!svg.trim().startsWith("<svg")) {
    alert("No SVG found in the pasted code.");
    return;
  }

  selectedSVG = svg;
  document.getElementById("svg-list").style.display = "none";
  document.getElementById("options").style.display = "block";
  document.getElementById("svg-preview").innerHTML = selectedSVG;
};

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabs[0].id },
      func: function () {
        var svgTags = document.querySelectorAll("svg");
        var arr = [];
        for (var i = 0; i < svgTags.length; i++) {
          arr.push(svgTags[i].outerHTML);
        }
        return arr;
      }
    },
    function (results) {
      svgs = results[0].result;
      renderSVGList();
    }
  );
});
