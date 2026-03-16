(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ImageModule = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/js/index.js":[function(require,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var templates = require("./templates");
var DocUtils = require("docxtemplater").DocUtils;
var DOMParser = require("xmldom").DOMParser;

function isNaN(number) {
	return !(number === number);
}

var ImgManager = require("./imgManager");
var moduleName = "open-xml-templating/docxtemplater-image-module";

function getInnerDocx(_ref) {
	var part = _ref.part;

	return part;
}

function getInnerPptx(_ref2) {
	var part = _ref2.part,
	    left = _ref2.left,
	    right = _ref2.right,
	    postparsed = _ref2.postparsed;

	var xmlString = postparsed.slice(left + 1, right).reduce(function (concat, item) {
		return concat + item.value;
	}, "");
	var xmlDoc = new DOMParser().parseFromString("<xml>" + xmlString + "</xml>");
	part.offset = { x: 0, y: 0 };
	part.ext = { cx: 0, cy: 0 };
	var offset = xmlDoc.getElementsByTagName("a:off");
	var ext = xmlDoc.getElementsByTagName("a:ext");
	if (ext.length > 0) {
		part.ext.cx = parseInt(ext[ext.length - 1].getAttribute("cx"), 10);
		part.ext.cy = parseInt(ext[ext.length - 1].getAttribute("cy"), 10);
	}
	if (offset.length > 0) {
		part.offset.x = parseInt(offset[offset.length - 1].getAttribute("x"), 10);
		part.offset.y = parseInt(offset[offset.length - 1].getAttribute("y"), 10);
	}
	return part;
}

var ImageModule = function () {
	function ImageModule(options) {
		_classCallCheck(this, ImageModule);

		this.name = "ImageModule";
		this.options = options || {};
		this.imgManagers = {};
		if (this.options.centered == null) {
			this.options.centered = false;
		}
		if (this.options.getImage == null) {
			throw new Error("You should pass getImage");
		}
		if (this.options.getSize == null) {
			throw new Error("You should pass getSize");
		}
		this.imageNumber = 1;
	}

	_createClass(ImageModule, [{
		key: "optionsTransformer",
		value: function optionsTransformer(options, docxtemplater) {
			var relsFiles = docxtemplater.zip.file(/\.xml\.rels/).concat(docxtemplater.zip.file(/\[Content_Types\].xml/)).map(function (file) {
				return file.name;
			});
			this.fileTypeConfig = docxtemplater.fileTypeConfig;
			this.fileType = docxtemplater.fileType;
			this.zip = docxtemplater.zip;
			options.xmlFileNames = options.xmlFileNames.concat(relsFiles);
			return options;
		}
	}, {
		key: "set",
		value: function set(options) {
			if (options.zip) {
				this.zip = options.zip;
			}
			if (options.xmlDocuments) {
				this.xmlDocuments = options.xmlDocuments;
			}
		}
	}, {
		key: "parse",
		value: function parse(placeHolderContent) {
			var module = moduleName;
			var type = "placeholder";
			if (this.options.setParser) {
				return this.options.setParser(placeHolderContent);
			}
			if (placeHolderContent.substring(0, 2) === "%%") {
				return { type: type, value: placeHolderContent.substr(2), module: module, centered: true };
			}
			if (placeHolderContent.substring(0, 1) === "%") {
				return { type: type, value: placeHolderContent.substr(1), module: module, centered: false };
			}
			return null;
		}
	}, {
		key: "postparse",
		value: function postparse(parsed) {
			var expandTo = void 0;
			var getInner = void 0;
			if (this.fileType === "pptx") {
				expandTo = "p:sp";
				getInner = getInnerPptx;
			} else {
				expandTo = this.options.centered ? "w:p" : "w:t";
				getInner = getInnerDocx;
			}
			return DocUtils.traits.expandToOne(parsed, { moduleName: moduleName, getInner: getInner, expandTo: expandTo });
		}
	}, {
		key: "render",
		value: function render(part, options) {
			if (!part.type === "placeholder" || part.module !== moduleName) {
				return null;
			}
			var tagValue = options.scopeManager.getValue(part.value, {
				part: part
			});
			if (!tagValue) {
				return { value: this.fileTypeConfig.tagTextXml };
			} else if ((typeof tagValue === "undefined" ? "undefined" : _typeof(tagValue)) === "object") {
				return this.getRenderedPart(part, tagValue.rId, tagValue.sizePixel);
			}
			// this.imgManagers[options.filePath] = this.imgManagers[options.filePath] || new ImgManager(this.zip, options.filePath, this.xmlDocuments, this.fileType);
			var imgManager = new ImgManager(this.zip, options.filePath, this.xmlDocuments, this.fileType);
			var imgBuffer = this.options.getImage(tagValue, part.value);
			var rId = imgManager.addImageRels(this.getNextImageName(), imgBuffer);
			var sizePixel = this.options.getSize(imgBuffer, tagValue, part.value);
			return this.getRenderedPart(part, rId, sizePixel);
		}
	}, {
		key: "resolve",
		value: function resolve(part, options) {
			var _this = this;

			// this.imgManagers[options.filePath] = this.imgManagers[options.filePath] || new ImgManager(this.zip, options.filePath, this.xmlDocuments, this.fileType);
			var imgManager = new ImgManager(this.zip, options.filePath, this.xmlDocuments, this.fileType);
			if (!part.type === "placeholder" || part.module !== moduleName) {
				return null;
			}
			var value = options.scopeManager.getValue(part.value, {
				part: part
			});
			if (!value) {
				return { value: this.fileTypeConfig.tagTextXml };
			}
			return new Promise(function (resolve) {
				var imgBuffer = _this.options.getImage(value, part.value);
				resolve(imgBuffer);
			}).then(function (imgBuffer) {
				var rId = imgManager.addImageRels(_this.getNextImageName(), imgBuffer);
				return new Promise(function (resolve) {
					var sizePixel = _this.options.getSize(imgBuffer, value, part.value);
					resolve(sizePixel);
				}).then(function (sizePixel) {
					return {
						rId: rId,
						sizePixel: sizePixel
					};
				});
			});
		}
	}, {
		key: "getRenderedPart",
		value: function getRenderedPart(part, rId, sizePixel) {
			if (isNaN(rId)) {
				throw new Error("rId is NaN, aborting");
			}
			var size = [DocUtils.convertPixelsToEmus(sizePixel[0]), DocUtils.convertPixelsToEmus(sizePixel[1])];
			var centered = this.options.centered || part.centered;
			var newText = void 0;
			if (this.fileType === "pptx") {
				newText = this.getRenderedPartPptx(part, rId, size, centered);
			} else {
				newText = this.getRenderedPartDocx(rId, size, centered);
			}
			return { value: newText };
		}
	}, {
		key: "getRenderedPartPptx",
		value: function getRenderedPartPptx(part, rId, size, centered) {
			var offset = { x: parseInt(part.offset.x, 10), y: parseInt(part.offset.y, 10) };
			var cellCX = parseInt(part.ext.cx, 10) || 1;
			var cellCY = parseInt(part.ext.cy, 10) || 1;
			var imgW = parseInt(size[0], 10) || 1;
			var imgH = parseInt(size[1], 10) || 1;
			if (centered) {
				offset.x = Math.round(offset.x + cellCX / 2 - imgW / 2);
				offset.y = Math.round(offset.y + cellCY / 2 - imgH / 2);
			}
			return templates.getPptxImageXml(rId, [imgW, imgH], offset);
		}
	}, {
		key: "getRenderedPartDocx",
		value: function getRenderedPartDocx(rId, size, centered) {
			return centered ? templates.getImageXmlCentered(rId, size) : templates.getImageXml(rId, size);
		}
	}, {
		key: "getNextImageName",
		value: function getNextImageName() {
			var name = "image_generated_" + this.imageNumber + ".png";
			this.imageNumber++;
			return name;
		}
	}]);

	return ImageModule;
}();

module.exports = ImageModule;
},{"./imgManager":2,"./templates":3,"docxtemplater":5,"xmldom":25}],1:[function(require,module,exports){
"use strict";

var DocUtils = require("docxtemplater").DocUtils;
DocUtils.convertPixelsToEmus = function (pixel) {
	return Math.round(pixel * 9525);
};
module.exports = DocUtils;
},{"docxtemplater":5}],2:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DocUtils = require("./docUtils");
var extensionRegex = /[^.]+\.([^.]+)/;

var rels = {
	getPrefix: function getPrefix(fileType) {
		return fileType === "docx" ? "word" : "ppt";
	},
	getFileTypeName: function getFileTypeName(fileType) {
		return fileType === "docx" ? "document" : "presentation";
	},
	getRelsFileName: function getRelsFileName(fileName) {
		return fileName.replace(/^.*?([a-zA-Z0-9]+)\.xml$/, "$1") + ".xml.rels";
	},
	getRelsFilePath: function getRelsFilePath(fileName, fileType) {
		var relsFileName = rels.getRelsFileName(fileName);
		var prefix = fileType === "pptx" ? "ppt/slides" : "word";
		return prefix + "/_rels/" + relsFileName;
	}
};

module.exports = function () {
	function ImgManager(zip, fileName, xmlDocuments, fileType) {
		_classCallCheck(this, ImgManager);

		this.fileName = fileName;
		this.prefix = rels.getPrefix(fileType);
		this.zip = zip;
		this.xmlDocuments = xmlDocuments;
		this.fileTypeName = rels.getFileTypeName(fileType);
		this.mediaPrefix = fileType === "pptx" ? "../media" : "media";
		var relsFilePath = rels.getRelsFilePath(fileName, fileType);
		this.relsDoc = xmlDocuments[relsFilePath] || this.createEmptyRelsDoc(xmlDocuments, relsFilePath);
	}

	_createClass(ImgManager, [{
		key: "createEmptyRelsDoc",
		value: function createEmptyRelsDoc(xmlDocuments, relsFileName) {
			var mainRels = this.prefix + "/_rels/" + this.fileTypeName + ".xml.rels";
			var doc = xmlDocuments[mainRels];
			if (!doc) {
				var err = new Error("Could not copy from empty relsdoc");
				err.properties = {
					mainRels: mainRels,
					relsFileName: relsFileName,
					files: Object.keys(this.zip.files)
				};
				throw err;
			}
			var relsDoc = DocUtils.str2xml(DocUtils.xml2str(doc));
			var relationships = relsDoc.getElementsByTagName("Relationships")[0];
			var relationshipChilds = relationships.getElementsByTagName("Relationship");
			for (var i = 0, l = relationshipChilds.length; i < l; i++) {
				relationships.removeChild(relationshipChilds[i]);
			}
			xmlDocuments[relsFileName] = relsDoc;
			return relsDoc;
		}
	}, {
		key: "loadImageRels",
		value: function loadImageRels() {
			var iterable = this.relsDoc.getElementsByTagName("Relationship");
			return Array.prototype.reduce.call(iterable, function (max, relationship) {
				var id = relationship.getAttribute("Id");
				if (/^rId[0-9]+$/.test(id)) {
					return Math.max(max, parseInt(id.substr(3), 10));
				}
				return max;
			}, 0);
		}
		// Add an extension type in the [Content_Types.xml], is used if for example you want word to be able to read png files (for every extension you add you need a contentType)

	}, {
		key: "addExtensionRels",
		value: function addExtensionRels(contentType, extension) {
			var contentTypeDoc = this.xmlDocuments["[Content_Types].xml"];
			var defaultTags = contentTypeDoc.getElementsByTagName("Default");
			var extensionRegistered = Array.prototype.some.call(defaultTags, function (tag) {
				return tag.getAttribute("Extension") === extension;
			});
			if (extensionRegistered) {
				return;
			}
			var types = contentTypeDoc.getElementsByTagName("Types")[0];
			var newTag = contentTypeDoc.createElement("Default");
			newTag.namespaceURI = null;
			newTag.setAttribute("ContentType", contentType);
			newTag.setAttribute("Extension", extension);
			types.appendChild(newTag);
		}
		// Add an image and returns it's Rid

	}, {
		key: "addImageRels",
		value: function addImageRels(imageName, imageData, i) {
			if (i == null) {
				i = 0;
			}
			var realImageName = i === 0 ? imageName : imageName + ("(" + i + ")");
			var imagePath = this.prefix + "/media/" + realImageName;
			if (this.zip.files[imagePath] != null) {
				return this.addImageRels(imageName, imageData, i + 1);
			}
			var image = {
				name: imagePath,
				data: imageData,
				options: {
					binary: true
				}
			};
			this.zip.file(image.name, image.data, image.options);
			var extension = realImageName.replace(extensionRegex, "$1");
			this.addExtensionRels("image/" + extension, extension);
			var relationships = this.relsDoc.getElementsByTagName("Relationships")[0];
			var newTag = this.relsDoc.createElement("Relationship");
			newTag.namespaceURI = null;
			var maxRid = this.loadImageRels() + 1;
			newTag.setAttribute("Id", "rId" + maxRid);
			newTag.setAttribute("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image");
			newTag.setAttribute("Target", this.mediaPrefix + "/" + realImageName);
			relationships.appendChild(newTag);
			return maxRid;
		}
	}]);

	return ImgManager;
}();
},{"./docUtils":1}],3:[function(require,module,exports){
"use strict";

module.exports = {
	getImageXml: function getImageXml(rId, size) {
		return ("<w:drawing>\n\t\t<wp:inline distT=\"0\" distB=\"0\" distL=\"0\" distR=\"0\">\n\t\t\t<wp:extent cx=\"" + size[0] + "\" cy=\"" + size[1] + "\"/>\n\t\t\t<wp:effectExtent l=\"0\" t=\"0\" r=\"0\" b=\"0\"/>\n\t\t\t<wp:docPr id=\"2\" name=\"Image 2\" descr=\"image\"/>\n\t\t\t<wp:cNvGraphicFramePr>\n\t\t\t\t<a:graphicFrameLocks xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" noChangeAspect=\"1\"/>\n\t\t\t</wp:cNvGraphicFramePr>\n\t\t\t<a:graphic xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\">\n\t\t\t\t<a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">\n\t\t\t\t\t<pic:pic xmlns:pic=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">\n\t\t\t\t\t\t<pic:nvPicPr>\n\t\t\t\t\t\t\t<pic:cNvPr id=\"0\" name=\"Picture 1\" descr=\"image\"/>\n\t\t\t\t\t\t\t<pic:cNvPicPr>\n\t\t\t\t\t\t\t\t<a:picLocks noChangeAspect=\"1\" noChangeArrowheads=\"1\"/>\n\t\t\t\t\t\t\t</pic:cNvPicPr>\n\t\t\t\t\t\t</pic:nvPicPr>\n\t\t\t\t\t\t<pic:blipFill>\n\t\t\t\t\t\t\t<a:blip r:embed=\"rId" + rId + "\">\n\t\t\t\t\t\t\t\t<a:extLst>\n\t\t\t\t\t\t\t\t\t<a:ext uri=\"{28A0092B-C50C-407E-A947-70E740481C1C}\">\n\t\t\t\t\t\t\t\t\t\t<a14:useLocalDpi xmlns:a14=\"http://schemas.microsoft.com/office/drawing/2010/main\" val=\"0\"/>\n\t\t\t\t\t\t\t\t\t</a:ext>\n\t\t\t\t\t\t\t\t</a:extLst>\n\t\t\t\t\t\t\t</a:blip>\n\t\t\t\t\t\t\t<a:srcRect/>\n\t\t\t\t\t\t\t<a:stretch>\n\t\t\t\t\t\t\t\t<a:fillRect/>\n\t\t\t\t\t\t\t</a:stretch>\n\t\t\t\t\t\t</pic:blipFill>\n\t\t\t\t\t\t<pic:spPr bwMode=\"auto\">\n\t\t\t\t\t\t\t<a:xfrm>\n\t\t\t\t\t\t\t\t<a:off x=\"0\" y=\"0\"/>\n\t\t\t\t\t\t\t\t<a:ext cx=\"" + size[0] + "\" cy=\"" + size[1] + "\"/>\n\t\t\t\t\t\t\t</a:xfrm>\n\t\t\t\t\t\t\t<a:prstGeom prst=\"rect\">\n\t\t\t\t\t\t\t\t<a:avLst/>\n\t\t\t\t\t\t\t</a:prstGeom>\n\t\t\t\t\t\t\t<a:noFill/>\n\t\t\t\t\t\t\t<a:ln>\n\t\t\t\t\t\t\t\t<a:noFill/>\n\t\t\t\t\t\t\t</a:ln>\n\t\t\t\t\t\t</pic:spPr>\n\t\t\t\t\t</pic:pic>\n\t\t\t\t</a:graphicData>\n\t\t\t</a:graphic>\n\t\t</wp:inline>\n\t</w:drawing>\n\t\t").replace(/\t|\n/g, "");
	},
	getImageXmlCentered: function getImageXmlCentered(rId, size) {
		return ("<w:p>\n\t\t\t<w:pPr>\n\t\t\t\t<w:jc w:val=\"center\"/>\n\t\t\t</w:pPr>\n\t\t\t<w:r>\n\t\t\t\t<w:rPr/>\n\t\t\t\t<w:drawing>\n\t\t\t\t\t<wp:inline distT=\"0\" distB=\"0\" distL=\"0\" distR=\"0\">\n\t\t\t\t\t<wp:extent cx=\"" + size[0] + "\" cy=\"" + size[1] + "\"/>\n\t\t\t\t\t<wp:docPr id=\"0\" name=\"Picture\" descr=\"\"/>\n\t\t\t\t\t<a:graphic xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\">\n\t\t\t\t\t\t<a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">\n\t\t\t\t\t\t<pic:pic xmlns:pic=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">\n\t\t\t\t\t\t\t<pic:nvPicPr>\n\t\t\t\t\t\t\t<pic:cNvPr id=\"0\" name=\"Picture\" descr=\"\"/>\n\t\t\t\t\t\t\t<pic:cNvPicPr>\n\t\t\t\t\t\t\t\t<a:picLocks noChangeAspect=\"1\" noChangeArrowheads=\"1\"/>\n\t\t\t\t\t\t\t</pic:cNvPicPr>\n\t\t\t\t\t\t\t</pic:nvPicPr>\n\t\t\t\t\t\t\t<pic:blipFill>\n\t\t\t\t\t\t\t<a:blip r:embed=\"rId" + rId + "\"/>\n\t\t\t\t\t\t\t<a:stretch>\n\t\t\t\t\t\t\t\t<a:fillRect/>\n\t\t\t\t\t\t\t</a:stretch>\n\t\t\t\t\t\t\t</pic:blipFill>\n\t\t\t\t\t\t\t<pic:spPr bwMode=\"auto\">\n\t\t\t\t\t\t\t<a:xfrm>\n\t\t\t\t\t\t\t\t<a:off x=\"0\" y=\"0\"/>\n\t\t\t\t\t\t\t\t<a:ext cx=\"" + size[0] + "\" cy=\"" + size[1] + "\"/>\n\t\t\t\t\t\t\t</a:xfrm>\n\t\t\t\t\t\t\t<a:prstGeom prst=\"rect\">\n\t\t\t\t\t\t\t\t<a:avLst/>\n\t\t\t\t\t\t\t</a:prstGeom>\n\t\t\t\t\t\t\t<a:noFill/>\n\t\t\t\t\t\t\t<a:ln w=\"9525\">\n\t\t\t\t\t\t\t\t<a:noFill/>\n\t\t\t\t\t\t\t\t<a:miter lim=\"800000\"/>\n\t\t\t\t\t\t\t\t<a:headEnd/>\n\t\t\t\t\t\t\t\t<a:tailEnd/>\n\t\t\t\t\t\t\t</a:ln>\n\t\t\t\t\t\t\t</pic:spPr>\n\t\t\t\t\t\t</pic:pic>\n\t\t\t\t\t\t</a:graphicData>\n\t\t\t\t\t</a:graphic>\n\t\t\t\t\t</wp:inline>\n\t\t\t\t</w:drawing>\n\t\t\t</w:r>\n\t\t</w:p>\n\t\t").replace(/\t|\n/g, "");
	},
	getPptxImageXml: function getPptxImageXml(rId, size, offset) {
		return ("<p:pic>\n\t\t\t<p:nvPicPr>\n\t\t\t\t<p:cNvPr id=\"6\" name=\"Picture 2\"/>\n\t\t\t\t<p:cNvPicPr>\n\t\t\t\t\t<a:picLocks noChangeAspect=\"1\" noChangeArrowheads=\"1\"/>\n\t\t\t\t</p:cNvPicPr>\n\t\t\t\t<p:nvPr/>\n\t\t\t</p:nvPicPr>\n\t\t\t<p:blipFill>\n\t\t\t\t<a:blip r:embed=\"rId" + rId + "\" cstate=\"print\">\n\t\t\t\t\t<a:extLst>\n\t\t\t\t\t\t<a:ext uri=\"{28A0092B-C50C-407E-A947-70E740481C1C}\">\n\t\t\t\t\t\t\t<a14:useLocalDpi xmlns:a14=\"http://schemas.microsoft.com/office/drawing/2010/main\" val=\"0\"/>\n\t\t\t\t\t\t</a:ext>\n\t\t\t\t\t</a:extLst>\n\t\t\t\t</a:blip>\n\t\t\t\t<a:srcRect/>\n\t\t\t\t<a:stretch>\n\t\t\t\t\t<a:fillRect/>\n\t\t\t\t</a:stretch>\n\t\t\t</p:blipFill>\n\t\t\t<p:spPr bwMode=\"auto\">\n\t\t\t\t<a:xfrm>\n\t\t\t\t\t<a:off x=\"" + offset.x + "\" y=\"" + offset.y + "\"/>\n\t\t\t\t\t<a:ext cx=\"" + size[0] + "\" cy=\"" + size[1] + "\"/>\n\t\t\t\t</a:xfrm>\n\t\t\t\t<a:prstGeom prst=\"rect\">\n\t\t\t\t\t<a:avLst/>\n\t\t\t\t</a:prstGeom>\n\t\t\t\t<a:noFill/>\n\t\t\t\t<a:ln>\n\t\t\t\t\t<a:noFill/>\n\t\t\t\t</a:ln>\n\t\t\t\t<a:effectLst/>\n\t\t\t\t<a:extLst>\n\t\t\t\t\t<a:ext uri=\"{909E8E84-426E-40DD-AFC4-6F175D3DCCD1}\">\n\t\t\t\t\t\t<a14:hiddenFill xmlns:a14=\"http://schemas.microsoft.com/office/drawing/2010/main\">\n\t\t\t\t\t\t\t<a:solidFill>\n\t\t\t\t\t\t\t\t<a:schemeClr val=\"accent1\"/>\n\t\t\t\t\t\t\t</a:solidFill>\n\t\t\t\t\t\t</a14:hiddenFill>\n\t\t\t\t\t</a:ext>\n\t\t\t\t\t<a:ext uri=\"{91240B29-F687-4F45-9708-019B960494DF}\">\n\t\t\t\t\t\t<a14:hiddenLine xmlns:a14=\"http://schemas.microsoft.com/office/drawing/2010/main\" w=\"9525\">\n\t\t\t\t\t\t\t<a:solidFill>\n\t\t\t\t\t\t\t\t<a:schemeClr val=\"tx1\"/>\n\t\t\t\t\t\t\t</a:solidFill>\n\t\t\t\t\t\t\t<a:miter lim=\"800000\"/>\n\t\t\t\t\t\t\t<a:headEnd/>\n\t\t\t\t\t\t\t<a:tailEnd/>\n\t\t\t\t\t\t</a14:hiddenLine>\n\t\t\t\t\t</a:ext>\n\t\t\t\t\t<a:ext uri=\"{AF507438-7753-43E0-B8FC-AC1667EBCBE1}\">\n\t\t\t\t\t\t<a14:hiddenEffects xmlns:a14=\"http://schemas.microsoft.com/office/drawing/2010/main\">\n\t\t\t\t\t\t\t<a:effectLst>\n\t\t\t\t\t\t\t\t<a:outerShdw dist=\"35921\" dir=\"2700000\" algn=\"ctr\" rotWithShape=\"0\">\n\t\t\t\t\t\t\t\t\t<a:schemeClr val=\"bg2\"/>\n\t\t\t\t\t\t\t\t</a:outerShdw>\n\t\t\t\t\t\t\t</a:effectLst>\n\t\t\t\t\t\t</a14:hiddenEffects>\n\t\t\t\t\t</a:ext>\n\t\t\t\t</a:extLst>\n\t\t\t</p:spPr>\n\t\t</p:pic>\n\t\t").replace(/\t|\n/g, "");
	}
};
},{}],4:[function(require,module,exports){
"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _require = require("xmldom"),
    DOMParser = _require.DOMParser,
    XMLSerializer = _require.XMLSerializer;

var _require2 = require("./errors"),
    throwXmlTagNotFound = _require2.throwXmlTagNotFound;

function parser(tag) {
  return _defineProperty({}, "get", function get(scope) {
    if (tag === ".") {
      return scope;
    }

    return scope[tag];
  });
}

function getNearestLeft(parsed, elements, index) {
  for (var i = index; i >= 0; i--) {
    var part = parsed[i];

    for (var j = 0, len = elements.length; j < len; j++) {
      var element = elements[j];

      if (part.value.indexOf("<" + element) === 0 && [">", " "].indexOf(part.value[element.length + 1]) !== -1) {
        return elements[j];
      }
    }
  }

  return null;
}

function getNearestRight(parsed, elements, index) {
  for (var i = index, l = parsed.length; i < l; i++) {
    var part = parsed[i];

    for (var j = 0, len = elements.length; j < len; j++) {
      var element = elements[j];

      if (part.value === "</" + element + ">") {
        return elements[j];
      }
    }
  }

  return -1;
}

function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function startsWith(str, prefix) {
  return str.substring(0, prefix.length) === prefix;
}

function unique(arr) {
  var hash = {},
      result = [];

  for (var i = 0, l = arr.length; i < l; ++i) {
    if (!hash.hasOwnProperty(arr[i])) {
      hash[arr[i]] = true;
      result.push(arr[i]);
    }
  }

  return result;
}

function chunkBy(parsed, f) {
  return parsed.reduce(function (chunks, p) {
    var currentChunk = last(chunks);

    if (currentChunk.length === 0) {
      currentChunk.push(p);
      return chunks;
    }

    var res = f(p);

    if (res === "start") {
      chunks.push([p]);
    } else if (res === "end") {
      currentChunk.push(p);
      chunks.push([]);
    } else {
      currentChunk.push(p);
    }

    return chunks;
  }, [[]]).filter(function (p) {
    return p.length > 0;
  });
}

function last(a) {
  return a[a.length - 1];
}

var defaults = {
  nullGetter: function nullGetter(part) {
    if (!part.module) {
      return "undefined";
    }

    if (part.module === "rawxml") {
      return "";
    }

    return "";
  },
  xmlFileNames: [],
  parser: parser,
  linebreaks: false,
  delimiters: {
    start: "{",
    end: "}"
  }
};

function mergeObjects() {
  var resObj = {};
  var obj, keys;

  for (var i = 0; i < arguments.length; i += 1) {
    obj = arguments[i];
    keys = Object.keys(obj);

    for (var j = 0; j < keys.length; j += 1) {
      resObj[keys[j]] = obj[keys[j]];
    }
  }

  return resObj;
}

function xml2str(xmlNode) {
  var a = new XMLSerializer();
  return a.serializeToString(xmlNode).replace(/xmlns(:[a-z0-9]+)?="" ?/g, "");
}

function str2xml(str) {
  var parser = new DOMParser();
  return parser.parseFromString(str, "text/xml");
}

var charMap = {
  "&": "&amp;",
  "'": "&apos;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
};
var regexStripRegexp = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;

function escapeRegExp(str) {
  return str.replace(regexStripRegexp, "\\$&");
}

var charMapRegexes = Object.keys(charMap).map(function (endChar) {
  var startChar = charMap[endChar];
  return {
    rstart: new RegExp(escapeRegExp(startChar), "g"),
    rend: new RegExp(escapeRegExp(endChar), "g"),
    start: startChar,
    end: endChar
  };
});

function wordToUtf8(string) {
  var r;

  for (var i = 0, l = charMapRegexes.length; i < l; i++) {
    r = charMapRegexes[i];
    string = string.replace(r.rstart, r.end);
  }

  return string;
}

function utf8ToWord(string) {
  if (typeof string !== "string") {
    string = string.toString();
  }

  var r;

  for (var i = 0, l = charMapRegexes.length; i < l; i++) {
    r = charMapRegexes[i];
    string = string.replace(r.rend, r.start);
  }

  return string;
} // This function is written with for loops for performance


function concatArrays(arrays) {
  var result = [];

  for (var i = 0; i < arrays.length; i++) {
    var array = arrays[i];

    for (var j = 0, len = array.length; j < len; j++) {
      result.push(array[j]);
    }
  }

  return result;
}

var spaceRegexp = new RegExp(String.fromCharCode(160), "g");

function convertSpaces(s) {
  return s.replace(spaceRegexp, " ");
}

function pregMatchAll(regex, content) {
  /* regex is a string, content is the content. It returns an array of all matches with their offset, for example:
  	 regex=la
  	 content=lolalolilala
  returns: [{array: {0: 'la'},offset: 2},{array: {0: 'la'},offset: 8},{array: {0: 'la'} ,offset: 10}]
  */
  var matchArray = [];
  var match;

  while ((match = regex.exec(content)) != null) {
    matchArray.push({
      array: match,
      offset: match.index
    });
  }

  return matchArray;
}

function getRight(parsed, element, index) {
  var val = getRightOrNull(parsed, element, index);

  if (val !== null) {
    return val;
  }

  throwXmlTagNotFound({
    position: "right",
    element: element,
    parsed: parsed,
    index: index
  });
}

function getRightOrNull(parsed, element, index) {
  for (var i = index, l = parsed.length; i < l; i++) {
    var part = parsed[i];

    if (part.value === "</" + element + ">") {
      return i;
    }
  }

  return null;
}

function getLeft(parsed, element, index) {
  var val = getLeftOrNull(parsed, element, index);

  if (val !== null) {
    return val;
  }

  throwXmlTagNotFound({
    position: "left",
    element: element,
    parsed: parsed,
    index: index
  });
}

function getLeftOrNull(parsed, element, index) {
  for (var i = index; i >= 0; i--) {
    var part = parsed[i];

    if (part.value.indexOf("<" + element) === 0 && [">", " "].indexOf(part.value[element.length + 1]) !== -1) {
      return i;
    }
  }

  return null;
}

function isTagStart(tagType, _ref2) {
  var type = _ref2.type,
      tag = _ref2.tag,
      position = _ref2.position;
  return type === "tag" && tag === tagType && position === "start";
}

function isTagEnd(tagType, _ref3) {
  var type = _ref3.type,
      tag = _ref3.tag,
      position = _ref3.position;
  return type === "tag" && tag === tagType && position === "end";
}

function isParagraphStart(options) {
  return isTagStart("w:p", options) || isTagStart("a:p", options);
}

function isParagraphEnd(options) {
  return isTagEnd("w:p", options) || isTagEnd("a:p", options);
}

function isTextStart(part) {
  return part.type === "tag" && part.position === "start" && part.text;
}

function isTextEnd(part) {
  return part.type === "tag" && part.position === "end" && part.text;
}

function isContent(p) {
  return p.type === "placeholder" || p.type === "content" && p.position === "insidetag";
}

var corruptCharacters = /[\x00-\x08\x0B\x0C\x0E-\x1F]/; // 00    NUL '\0' (null character)
// 01    SOH (start of heading)
// 02    STX (start of text)
// 03    ETX (end of text)
// 04    EOT (end of transmission)
// 05    ENQ (enquiry)
// 06    ACK (acknowledge)
// 07    BEL '\a' (bell)
// 08    BS  '\b' (backspace)
// 0B    VT  '\v' (vertical tab)
// 0C    FF  '\f' (form feed)
// 0E    SO  (shift out)
// 0F    SI  (shift in)
// 10    DLE (data link escape)
// 11    DC1 (device control 1)
// 12    DC2 (device control 2)
// 13    DC3 (device control 3)
// 14    DC4 (device control 4)
// 15    NAK (negative ack.)
// 16    SYN (synchronous idle)
// 17    ETB (end of trans. blk)
// 18    CAN (cancel)
// 19    EM  (end of medium)
// 1A    SUB (substitute)
// 1B    ESC (escape)
// 1C    FS  (file separator)
// 1D    GS  (group separator)
// 1E    RS  (record separator)
// 1F    US  (unit separator)

function hasCorruptCharacters(string) {
  return corruptCharacters.test(string);
}

module.exports = {
  endsWith: endsWith,
  startsWith: startsWith,
  getNearestLeft: getNearestLeft,
  getNearestRight: getNearestRight,
  isContent: isContent,
  isParagraphStart: isParagraphStart,
  isParagraphEnd: isParagraphEnd,
  isTagStart: isTagStart,
  isTagEnd: isTagEnd,
  isTextStart: isTextStart,
  isTextEnd: isTextEnd,
  unique: unique,
  chunkBy: chunkBy,
  last: last,
  mergeObjects: mergeObjects,
  xml2str: xml2str,
  str2xml: str2xml,
  getRightOrNull: getRightOrNull,
  getRight: getRight,
  getLeftOrNull: getLeftOrNull,
  getLeft: getLeft,
  pregMatchAll: pregMatchAll,
  convertSpaces: convertSpaces,
  escapeRegExp: escapeRegExp,
  charMapRegexes: charMapRegexes,
  hasCorruptCharacters: hasCorruptCharacters,
  defaults: defaults,
  wordToUtf8: wordToUtf8,
  utf8ToWord: utf8ToWord,
  concatArrays: concatArrays,
  charMap: charMap
};
},{"./errors":6,"xmldom":25}],5:[function(require,module,exports){
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var DocUtils = require("./doc-utils");

DocUtils.traits = require("./traits");
DocUtils.moduleWrapper = require("./module-wrapper");

var Lexer = require("./lexer");

var defaults = DocUtils.defaults,
    str2xml = DocUtils.str2xml,
    xml2str = DocUtils.xml2str,
    moduleWrapper = DocUtils.moduleWrapper,
    utf8ToWord = DocUtils.utf8ToWord,
    concatArrays = DocUtils.concatArrays,
    unique = DocUtils.unique;

var _require = require("./errors"),
    XTInternalError = _require.XTInternalError,
    throwFileTypeNotIdentified = _require.throwFileTypeNotIdentified,
    throwFileTypeNotHandled = _require.throwFileTypeNotHandled,
    throwApiVersionError = _require.throwApiVersionError;

var currentModuleApiVersion = [3, 7, 0];

var Docxtemplater =
/*#__PURE__*/
function () {
  function Docxtemplater() {
    _classCallCheck(this, Docxtemplater);

    if (arguments.length > 0) {
      throw new Error("The constructor with parameters has been removed in docxtemplater 3, please check the upgrade guide.");
    }

    this.compiled = {};
    this.modules = [];
    this.setOptions({});
  }

  _createClass(Docxtemplater, [{
    key: "getModuleApiVersion",
    value: function getModuleApiVersion() {
      return currentModuleApiVersion.join(".");
    }
  }, {
    key: "verifyApiVersion",
    value: function verifyApiVersion(neededVersion) {
      neededVersion = neededVersion.split(".").map(function (i) {
        return parseInt(i, 10);
      });

      if (neededVersion.length !== 3) {
        throwApiVersionError("neededVersion is not a valid version", {
          neededVersion: neededVersion,
          explanation: "the neededVersion must be an array of length 3"
        });
      }

      if (neededVersion[0] !== currentModuleApiVersion[0]) {
        throwApiVersionError("The major api version do not match, you probably have to update docxtemplater with npm install --save docxtemplater", {
          neededVersion: neededVersion,
          currentModuleApiVersion: currentModuleApiVersion,
          explanation: "moduleAPIVersionMismatch : needed=".concat(neededVersion.join("."), ", current=").concat(currentModuleApiVersion.join("."))
        });
      }

      if (neededVersion[1] > currentModuleApiVersion[1]) {
        throwApiVersionError("The minor api version is not uptodate, you probably have to update docxtemplater with npm install --save docxtemplater", {
          neededVersion: neededVersion,
          currentModuleApiVersion: currentModuleApiVersion,
          explanation: "moduleAPIVersionMismatch : needed=".concat(neededVersion.join("."), ", current=").concat(currentModuleApiVersion.join("."))
        });
      }

      return true;
    }
  }, {
    key: "setModules",
    value: function setModules(obj) {
      this.modules.forEach(function (module) {
        module.set(obj);
      });
    }
  }, {
    key: "sendEvent",
    value: function sendEvent(eventName) {
      this.modules.forEach(function (module) {
        module.on(eventName);
      });
    }
  }, {
    key: "attachModule",
    value: function attachModule(module) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var prefix = options.prefix;

      if (prefix) {
        module.prefix = prefix;
      }

      var wrappedModule = moduleWrapper(module);
      this.modules.push(wrappedModule);
      wrappedModule.on("attached");
      return this;
    }
  }, {
    key: "setOptions",
    value: function setOptions(options) {
      var _this = this;

      if (options.delimiters) {
        options.delimiters.start = utf8ToWord(options.delimiters.start);
        options.delimiters.end = utf8ToWord(options.delimiters.end);
      }

      this.options = options;
      Object.keys(defaults).forEach(function (key) {
        var defaultValue = defaults[key];
        _this.options[key] = _this.options[key] != null ? _this.options[key] : defaultValue;
        _this[key] = _this.options[key];
      });

      if (this.zip) {
        this.updateFileTypeConfig();
      }

      return this;
    }
  }, {
    key: "loadZip",
    value: function loadZip(zip) {
      if (zip.loadAsync) {
        throw new XTInternalError("Docxtemplater doesn't handle JSZip version >=3, see changelog");
      }

      this.zip = zip;
      this.updateFileTypeConfig();
      this.modules = concatArrays([this.fileTypeConfig.baseModules.map(function (moduleFunction) {
        return moduleFunction();
      }), this.modules]);
      return this;
    }
  }, {
    key: "compileFile",
    value: function compileFile(fileName) {
      var currentFile = this.createTemplateClass(fileName);
      currentFile.parse();
      this.compiled[fileName] = currentFile;
    }
  }, {
    key: "resolveData",
    value: function resolveData(data) {
      var _this2 = this;

      return Promise.all(Object.keys(this.compiled).map(function (from) {
        var currentFile = _this2.compiled[from];
        return currentFile.resolveTags(data);
      })).then(function (resolved) {
        return concatArrays(resolved);
      });
    }
  }, {
    key: "compile",
    value: function compile() {
      var _this3 = this;

      if (Object.keys(this.compiled).length) {
        return this;
      }

      this.options = this.modules.reduce(function (options, module) {
        return module.optionsTransformer(options, _this3);
      }, this.options);
      this.options.xmlFileNames = unique(this.options.xmlFileNames);
      this.xmlDocuments = this.options.xmlFileNames.reduce(function (xmlDocuments, fileName) {
        var content = _this3.zip.files[fileName].asText();

        xmlDocuments[fileName] = str2xml(content);
        return xmlDocuments;
      }, {});
      this.setModules({
        zip: this.zip,
        xmlDocuments: this.xmlDocuments
      });
      this.getTemplatedFiles();
      this.setModules({
        compiled: this.compiled
      }); // Loop inside all templatedFiles (ie xml files with content).
      // Sometimes they don't exist (footer.xml for example)

      this.templatedFiles.forEach(function (fileName) {
        if (_this3.zip.files[fileName] != null) {
          _this3.compileFile(fileName);
        }
      });
      return this;
    }
  }, {
    key: "updateFileTypeConfig",
    value: function updateFileTypeConfig() {
      var fileType;

      if (this.zip.files.mimetype) {
        fileType = "odt";
      }

      if (this.zip.files["word/document.xml"] || this.zip.files["word/document2.xml"]) {
        fileType = "docx";
      }

      if (this.zip.files["ppt/presentation.xml"]) {
        fileType = "pptx";
      }

      if (fileType === "odt") {
        throwFileTypeNotHandled(fileType);
      }

      if (!fileType) {
        throwFileTypeNotIdentified();
      }

      this.fileType = fileType;
      this.fileTypeConfig = this.options.fileTypeConfig || Docxtemplater.FileTypeConfig[this.fileType];
      return this;
    }
  }, {
    key: "render",
    value: function render() {
      var _this4 = this;

      this.compile();
      this.setModules({
        data: this.data,
        Lexer: Lexer
      });
      this.mapper = this.modules.reduce(function (value, module) {
        return module.getRenderedMap(value);
      }, {});
      this.fileTypeConfig.tagsXmlLexedArray = unique(this.fileTypeConfig.tagsXmlLexedArray);
      this.fileTypeConfig.tagsXmlTextArray = unique(this.fileTypeConfig.tagsXmlTextArray);
      Object.keys(this.mapper).forEach(function (to) {
        var _this4$mapper$to = _this4.mapper[to],
            from = _this4$mapper$to.from,
            data = _this4$mapper$to.data;
        var currentFile = _this4.compiled[from];
        currentFile.setTags(data);
        currentFile.render(to);

        _this4.zip.file(to, currentFile.content, {
          createFolders: true
        });
      });
      this.sendEvent("syncing-zip");
      this.syncZip();
      return this;
    }
  }, {
    key: "syncZip",
    value: function syncZip() {
      var _this5 = this;

      Object.keys(this.xmlDocuments).forEach(function (fileName) {
        _this5.zip.remove(fileName);

        var content = xml2str(_this5.xmlDocuments[fileName]);
        return _this5.zip.file(fileName, content, {
          createFolders: true
        });
      });
    }
  }, {
    key: "setData",
    value: function setData(data) {
      this.data = data;
      return this;
    }
  }, {
    key: "getZip",
    value: function getZip() {
      return this.zip;
    }
  }, {
    key: "createTemplateClass",
    value: function createTemplateClass(path) {
      var usedData = this.zip.files[path].asText();
      return this.createTemplateClassFromContent(usedData, path);
    }
  }, {
    key: "createTemplateClassFromContent",
    value: function createTemplateClassFromContent(content, filePath) {
      var _this6 = this;

      var xmltOptions = {
        filePath: filePath
      };
      Object.keys(defaults).forEach(function (key) {
        xmltOptions[key] = _this6[key];
      });
      xmltOptions.fileTypeConfig = this.fileTypeConfig;
      xmltOptions.modules = this.modules;
      return new Docxtemplater.XmlTemplater(content, xmltOptions);
    }
  }, {
    key: "getFullText",
    value: function getFullText(path) {
      return this.createTemplateClass(path || this.fileTypeConfig.textPath(this.zip)).getFullText();
    }
  }, {
    key: "getTemplatedFiles",
    value: function getTemplatedFiles() {
      this.templatedFiles = this.fileTypeConfig.getTemplatedFiles(this.zip);
      return this.templatedFiles;
    }
  }]);

  return Docxtemplater;
}();

Docxtemplater.DocUtils = DocUtils;
Docxtemplater.Errors = require("./errors");
Docxtemplater.XmlTemplater = require("./xml-templater");
Docxtemplater.FileTypeConfig = require("./file-type-config");
Docxtemplater.XmlMatcher = require("./xml-matcher");
module.exports = Docxtemplater;
},{"./doc-utils":4,"./errors":6,"./file-type-config":7,"./lexer":8,"./module-wrapper":10,"./traits":22,"./xml-matcher":23,"./xml-templater":24}],6:[function(require,module,exports){
"use strict";

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function first(a) {
  return a[0];
}

function last(a) {
  return a[a.length - 1];
}

function XTError(message) {
  this.name = "GenericError";
  this.message = message;
  this.stack = new Error(message).stack;
}

XTError.prototype = Error.prototype;

function XTTemplateError(message) {
  this.name = "TemplateError";
  this.message = message;
  this.stack = new Error(message).stack;
}

XTTemplateError.prototype = new XTError();

function RenderingError(message) {
  this.name = "RenderingError";
  this.message = message;
  this.stack = new Error(message).stack;
}

RenderingError.prototype = new XTError();

function XTScopeParserError(message) {
  this.name = "ScopeParserError";
  this.message = message;
  this.stack = new Error(message).stack;
}

XTScopeParserError.prototype = new XTError();

function XTInternalError(message) {
  this.name = "InternalError";
  this.properties = {
    explanation: "InternalError"
  };
  this.message = message;
  this.stack = new Error(message).stack;
}

XTInternalError.prototype = new XTError();

function XTAPIVersionError(message) {
  this.name = "APIVersionError";
  this.properties = {
    explanation: "APIVersionError"
  };
  this.message = message;
  this.stack = new Error(message).stack;
}

XTAPIVersionError.prototype = new XTError();

function throwApiVersionError(msg, properties) {
  var err = new XTAPIVersionError(msg);
  err.properties = _objectSpread({
    id: "api_version_error"
  }, properties);
  throw err;
}

function throwMultiError(errors) {
  var err = new XTTemplateError("Multi error");
  err.properties = {
    errors: errors,
    id: "multi_error",
    explanation: "The template has multiple errors"
  };
  throw err;
}

function getUnopenedTagException(options) {
  var err = new XTTemplateError("Unopened tag");
  err.properties = {
    xtag: last(options.xtag.split(" ")),
    id: "unopened_tag",
    context: options.xtag,
    offset: options.offset,
    lIndex: options.lIndex,
    explanation: "The tag beginning with \"".concat(options.xtag.substr(0, 10), "\" is unopened")
  };
  return err;
}

function getUnclosedTagException(options) {
  var err = new XTTemplateError("Unclosed tag");
  err.properties = {
    xtag: first(options.xtag.split(" ")).substr(1),
    id: "unclosed_tag",
    context: options.xtag,
    offset: options.offset,
    lIndex: options.lIndex,
    explanation: "The tag beginning with \"".concat(options.xtag.substr(0, 10), "\" is unclosed")
  };
  return err;
}

function throwXmlTagNotFound(options) {
  var err = new XTTemplateError("No tag \"".concat(options.element, "\" was found at the ").concat(options.position));
  err.properties = {
    id: "no_xml_tag_found_at_".concat(options.position),
    explanation: "No tag \"".concat(options.element, "\" was found at the ").concat(options.position),
    part: options.parsed[options.index],
    parsed: options.parsed,
    index: options.index,
    element: options.element
  };
  throw err;
}

function throwCorruptCharacters(_ref) {
  var tag = _ref.tag,
      value = _ref.value;
  var err = new RenderingError("There are some XML corrupt characters");
  err.properties = {
    id: "invalid_xml_characters",
    xtag: tag,
    value: value,
    explanation: "There are some corrupt characters for the field ${tag}"
  };
  throw err;
}

function throwContentMustBeString(type) {
  var err = new XTInternalError("Content must be a string");
  err.properties.id = "xmltemplater_content_must_be_string";
  err.properties.type = type;
  throw err;
}

function throwRawTagNotInParagraph(options) {
  var err = new XTTemplateError("Raw tag not in paragraph");
  var _options$part = options.part,
      value = _options$part.value,
      offset = _options$part.offset;
  err.properties = {
    id: "raw_tag_outerxml_invalid",
    explanation: "The tag \"".concat(value, "\" is not inside a paragraph"),
    rootError: options.rootError,
    xtag: value,
    offset: offset,
    postparsed: options.postparsed,
    expandTo: options.expandTo,
    index: options.index
  };
  throw err;
}

function throwRawTagShouldBeOnlyTextInParagraph(options) {
  var err = new XTTemplateError("Raw tag should be the only text in paragraph");
  var tag = options.part.value;
  err.properties = {
    id: "raw_xml_tag_should_be_only_text_in_paragraph",
    explanation: "The raw tag \"".concat(tag, "\" should be the only text in this paragraph. This means that this tag should not be surrounded by any text or spaces."),
    xtag: tag,
    offset: options.part.offset,
    paragraphParts: options.paragraphParts
  };
  throw err;
}

function getUnmatchedLoopException(options) {
  var location = options.location;
  var t = location === "start" ? "unclosed" : "unopened";
  var T = location === "start" ? "Unclosed" : "Unopened";
  var err = new XTTemplateError("".concat(T, " loop"));
  var tag = options.part.value;
  err.properties = {
    id: "".concat(t, "_loop"),
    explanation: "The loop with tag \"".concat(tag, "\" is ").concat(t),
    xtag: tag
  };
  return err;
}

function getClosingTagNotMatchOpeningTag(options) {
  var tags = options.tags;
  var err = new XTTemplateError("Closing tag does not match opening tag");
  err.properties = {
    id: "closing_tag_does_not_match_opening_tag",
    explanation: "The tag \"".concat(tags[0].value, "\" is closed by the tag \"").concat(tags[1].value, "\""),
    openingtag: tags[0].value,
    offset: [tags[0].offset, tags[1].offset],
    closingtag: tags[1].value
  };
  return err;
}

function getScopeCompilationError(_ref2) {
  var tag = _ref2.tag,
      rootError = _ref2.rootError;
  var err = new XTScopeParserError("Scope parser compilation failed");
  err.properties = {
    id: "scopeparser_compilation_failed",
    tag: tag,
    explanation: "The scope parser for the tag \"".concat(tag, "\" failed to compile"),
    rootError: rootError
  };
  return err;
}

function getScopeParserExecutionError(_ref3) {
  var tag = _ref3.tag,
      scope = _ref3.scope,
      error = _ref3.error;
  var err = new XTScopeParserError("Scope parser execution failed");
  err.properties = {
    id: "scopeparser_execution_failed",
    explanation: "The scope parser for the tag ".concat(tag, " failed to execute"),
    scope: scope,
    tag: tag,
    rootError: error
  };
  return err;
}

function getLoopPositionProducesInvalidXMLError(_ref4) {
  var tag = _ref4.tag;
  var err = new XTTemplateError("The position of the loop tags \"".concat(tag, "\" would produce invalid XML"));
  err.properties = {
    tag: tag,
    id: "loop_position_invalid",
    explanation: "The tags \"".concat(tag, "\" are misplaced in the document, for example one of them is in a table and the other one outside the table")
  };
  return err;
}

function throwUnimplementedTagType(part) {
  var err = new XTTemplateError("Unimplemented tag type \"".concat(part.type, "\""));
  err.properties = {
    part: part,
    id: "unimplemented_tag_type"
  };
  throw err;
}

function throwMalformedXml(part) {
  var err = new XTInternalError("Malformed xml");
  err.properties = {
    part: part,
    id: "malformed_xml"
  };
  throw err;
}

function throwLocationInvalid(part) {
  throw new XTInternalError("Location should be one of \"start\" or \"end\" (given : ".concat(part.location, ")"));
}

function throwFileTypeNotHandled(fileType) {
  var err = new XTInternalError("The filetype \"".concat(fileType, "\" is not handled by docxtemplater"));
  err.properties = {
    id: "filetype_not_handled",
    explanation: "The file you are trying to generate is of type \"".concat(fileType, "\", but only docx and pptx formats are handled"),
    fileType: fileType
  };
  throw err;
}

function throwFileTypeNotIdentified() {
  var err = new XTInternalError("The filetype for this file could not be identified, is this file corrupted ?");
  err.properties = {
    id: "filetype_not_identified"
  };
  throw err;
}

function throwXmlInvalid(content, offset) {
  var err = new XTTemplateError("An XML file has invalid xml");
  err.properties = {
    id: "file_has_invalid_xml",
    content: content,
    offset: offset,
    explanation: "The docx contains invalid XML, it is most likely corrupt"
  };
  throw err;
}

module.exports = {
  XTError: XTError,
  XTTemplateError: XTTemplateError,
  XTInternalError: XTInternalError,
  XTScopeParserError: XTScopeParserError,
  XTAPIVersionError: XTAPIVersionError,
  RenderingError: RenderingError,
  getClosingTagNotMatchOpeningTag: getClosingTagNotMatchOpeningTag,
}
