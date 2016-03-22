// app.js - progflow

// globals
var mainPanel;
var nodePanel;
var terminal;
var context;

// constants
const VERSION = "0.0";
const PROGNAME = "ProgFlow Simulator";
const AGENTINFO = navigator.userAgent;

// initPage() - create page content programmatically
function initPage() {
    var controlPanel = document.getElementById('div-control-panel');
    var terminalView = document.getElementById('div-terminal-view');
    var canvasView = document.getElementById('div-canvas-view');
    mainPanel = document.createElement('div');
    mainPanel.id = 'div-main-panel';
    mainPanel.className = 'div-main-panel';

    mainPanel.addElement = function(tagKind,id,className) {
        var child = document.createElement(tagKind);
        child.id = id;
        child.className = className;
        this.appendChild(child);
    };
    mainPanel.addBreak = function(visible) {
        if (typeof visible == 'undefined')
            visible = true;

        if (visible)
            this.appendChild(document.createElement("hr"));
        else
            this.appendChild(document.createElement("br"));
    };
    mainPanel.addTextField = function(id,maxLength,defaultText) {
        if (typeof defaultText === 'undefined')
            defaultText = "";

        var ed = document.createElement("input");
        this.appendChild(ed);
        ed.type = 'text';
        ed.className = 'control-panel-text-entry';
        ed.id = id;
        ed.value = defaultText;
        if (typeof maxLength !== 'undefined')
            ed.maxLength = maxLength;

        var ws = (this.offsetWidth - ed.previousSibling.offsetWidth-12) + "px";
        ed.style.width = ws;
        this.appendChild(document.createElement("br"));
    };
    mainPanel.addButtonA = function(label,callback) {
        var btn = document.createElement("button");
        this.appendChild(btn);
        btn.type = 'button';
        btn.className = 'control-panel-button-a';
        btn.appendChild(document.createTextNode(label));
        btn.onclick = callback;
    };
    mainPanel.addButtonB = function(label,callback) {
        var btn = document.createElement("button");
        this.appendChild(btn);
        btn.type = 'button';
        btn.className = 'control-panel-button-b';
        btn.appendChild(document.createTextNode(label));
        btn.onclick = callback;
    };
    mainPanel.addLabel = function(label,bold) {
        if (typeof bold === 'undefined')
            bold = false;

        var lbl = document.createElement('span');
        lbl.innerHTML = label;
        lbl.className = bold ? 'control-panel-label-bold' : 'control-panel-label';
        this.appendChild(lbl);
    };
    mainPanel.addCheckbox = function(id,defaultState,callback) {
        var cb = document.createElement("input");
        cb.id = id;
        cb.className = "control-panel-checkbox";
        cb.type = "checkbox";
        cb.checked = defaultState;
        cb.onclick = callback;
        this.appendChild(cb);
    };
    mainPanel.getElementValue = function(id) {
        var elem = document.getElementById(id);
        return elem.value;
    };

    // create the node panel which is the sub-control panel for nodes
    nodePanel = document.createElement('div');
    nodePanel.id = 'div-node-panel';
    nodePanel.className = 'node-panel-view';
    nodePanel.activated = false;
    nodePanel.addElement = mainPanel.addElement;
    nodePanel.addBreak = mainPanel.addBreak;
    nodePanel.addTextField = mainPanel.addTextField;
    nodePanel.addButtonA = mainPanel.addButtonA;
    nodePanel.addButtonB = mainPanel.addButtonB;
    nodePanel.addLabel = mainPanel.addLabel;
    nodePanel.addCheckbox = mainPanel.addCheckbox;
    nodePanel.getElementValue = mainPanel.getElementValue;

    // create main panel buttons
    mainPanel.addButtonB("new",buttonNew);
    mainPanel.addTextField("flowchart-name",16);
    mainPanel.addButtonB("save project",buttonSaveProject);
    mainPanel.addButtonB("open project",buttonOpenProject);
    mainPanel.addButtonB("close project",buttonCloseProject);
    mainPanel.addButtonB("help pages",buttonHelp);
    mainPanel.addButtonB("about ProgFlow",buttonAbout);
    mainPanel.addBreak();
    mainPanel.addButtonA("oper",buttonMakeOperationNode);
    mainPanel.addButtonA("in",buttonMakeInNode);
    mainPanel.addButtonA("out",buttonMakeOutNode);
    mainPanel.addButtonA("if",buttonMakeIfNode);
    mainPanel.addButtonA("while",buttonMakeWhileNode);
    mainPanel.addButtonA("ret");
    mainPanel.addButtonA("proc",buttonMakeProcNode);
    mainPanel.addBreak();
    mainPanel.addButtonB("C++");
    mainPanel.addButtonB("Python");
    mainPanel.addButtonB("exec",buttonExec);
    mainPanel.addButtonB("trace");
    mainPanel.addButtonB("clear",buttonClearTerminal);
    mainPanel.addBreak();

    // add the two sub-panels to the control panel
    controlPanel.appendChild(mainPanel);
    controlPanel.appendChild(nodePanel);

    // create terminal content
    terminal = new Terminal(terminalView);
    terminal.addLine(PROGNAME + " " + VERSION);
    terminal.addLine(AGENTINFO);

    // create canvas and render context
    var canvas = document.createElement("canvas");
    canvas.appendChild(document.createTextNode("Browser does not support HTML5 Canvas"));
    canvas.setAttribute("id","canvas-main");
    canvasView.appendChild(canvas);
    context = new DrawingContext(canvas,canvasView,{label: "program"});
}

// resizePage() - handle window resize event
function resizePage() {
    // resize all control panel text areas
    var controlPanel = document.getElementById('div-control-panel');
    var nodes = controlPanel.getElementsByClassName('control-panel-text-entry');
    for (var i = 0;i < nodes.length;i++) {
        var w = controlPanel.offsetWidth-nodes[i].previousSibling.offsetWidth-12;
        nodes[i].style.width = w + "px";
    }

    // resize canvas
    context.resizeCanvas();
}

////////////////////////////////////////////////////////////////////////////////
// Button handlers for main UI
////////////////////////////////////////////////////////////////////////////////

function buttonNew() {
    // overwrite the current context with another one
    var canvas = document.getElementById("canvas-main");
    var canvasView = document.getElementById("div-canvas-view");

    // grab the name of the new project from the box
    var name = mainPanel.getElementValue("flowchart-name");
    if (name == "") {
        alert("Please specify a project name in the input field at left.");
        return;
    }

    // TODO: check save state

    context = new DrawingContext(canvas,canvasView,{label: name});
    context.drawScreen();
}

function buttonSaveProject() {
    // generate a savable representation of the program and download it as a
    // data-URL

    var rep = context.getSaveRep();
    var json = JSON.stringify(rep,null,4);
    var dataURL = "data:text/json;charset=utf-8," + encodeURIComponent(json);
    var head = document.createElement('h1');
    var link = document.createElement('a');
    var jsonBox = document.createElement('textarea');

    head.innerHTML = "Save Project";
    link.download = rep.label + ".json";
    link.href = dataURL;
    link.innerHTML = "Download Save Program Representation";
    jsonBox.innerHTML = json;
    jsonBox.className = "save-json-box";
    jsonBox.readOnly = true;
    var dialog = new CustomPage({
        content:[head,jsonBox,document.createElement("br"),link]
    });
    dialog.show();
    context.unmodified();
}

function buttonOpenProject() {
    var warning;
    if (context.isModified()) {
        warning = document.createElement("p");
        warning.className = "open-file-warning";
        warning.innerHTML = "WARNING: You have modified the current project. "
            + "Opening another project will overwrite your changes. Go back and "
            + "save them first if you want to avoid losing your changes.";
    }

    var selectedFile = null;
    var head = document.createElement('h1');
    var link = document.createElement('a');
    var div = document.createElement('div');
    var a = document.createElement('div'), b = document.createElement('div');
    var input = document.createElement('input');
    var lbl = document.createElement('p');
    var preview = document.createElement('textarea');

    head.innerHTML = "Open Project";
    link.innerHTML = "Choose File...";
    link.href = "#";
    link.onclick = function(e) {
        input.click();
        e.preventDefault();
    };
    div.className = "open-file-div";
    a.className = "open-file-div-inner";
    b.className = "open-file-div-inner";
    input.className = "open-file-input";
    input.type = "file";
    input.onchange = function() {
        if (this.files.length > 1) {
            lbl.className = "open-file-error-p";
            lbl.innerHTML = "Please only specify 1 file";
            selectedFile = null;
            return;
        }

        selectedFile = this.files[0];
        lbl.className = "open-file-p";
        lbl.innerHTML = selectedFile.name;

        try {
            var reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = e.target.result;
            };
            reader.readAsText(selectedFile);
        } catch (e) {
            selectedFile = null;
            lbl.className = "open-file-error-p";
            lbl.innerHTML = "Failed to read input file: " + e;
            return;
        }
    };
    lbl.className = "open-file-error-p";
    lbl.innerHTML = "No file selected";
    preview.readOnly = true;
    preview.className = "json-preview-box";

    div.appendChild(a);
    div.appendChild(b);
    if (typeof warning != "undefined")
        a.appendChild(warning);
    a.appendChild(input);
    a.appendChild(link);
    a.appendChild(lbl);
    b.appendChild(preview);

    function onOpen() {
        if (selectedFile != null) {
            try {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var newcontext;
                    var canvas = document.getElementById("canvas-main");
                    var canvasView = document.getElementById("div-canvas-view");

                    try {
                        newcontext = new DrawingContext(
                            canvas,
                            canvasView,
                            JSON.parse(e.target.result) );
                    } catch (err) {
                        selectedFile = null;
                        lbl.className = "open-file-error-p";
                        lbl.innerHTML = "Failed to load input file: " + e;
                        return;
                    }

                    context = newcontext;
                    context.drawScreen();
                    dialog.close();
                };
                reader.readAsText(selectedFile);
            } catch (e) {
                selectedFile = null;
                lbl.className = "open-file-error-p";
                lbl.innerHTML = "Failed to read input file: " + e;
                return;
            }
        }
        else
            alert("Please select a file.");
    }

    var dialog = new CustomPage({
        content:[head,input,div],
        actions:[
            {label: "Open File", callback: onOpen}
        ]
    });
    dialog.show();
}

function buttonCloseProject() {
    // this is really just to help OCD people clear the screen
    var canvas = document.getElementById("canvas-main");
    var canvasView = document.getElementById("div-canvas-view");

    // TODO: check save state

    context = new DrawingContext(canvas,canvasView,{label: "program"});
    nodePanel.innerHTML = '';
}

function buttonAbout() {
    var aboutPage = new Page('pages/about.html');
    aboutPage.show();
}

function buttonHelp() {
    var helpPage = new Page('pages/help.html');
    helpPage.show();
}

function buttonMakeOperationNode() {
    // add an operation node to the context
    context.addNode('flowoperation');
}

function buttonMakeInNode() {
    context.addNode('flowin');
}

function buttonMakeOutNode() {
    context.addNode('flowout');
}

function buttonMakeIfNode() {
    context.addNode('flowif');
}

function buttonMakeWhileNode() {
    context.addNode('flowwhile');
}

function buttonMakeProcNode() {
    // add a procedure node whose name is unique

}

function buttonExec() {
    var logic = context.topLevelLogic();

    logic.exec();
}

function buttonClearTerminal() {
    terminal.clearScreen();
}

////////////////////////////////////////////////////////////////////////////////
// Initialization
////////////////////////////////////////////////////////////////////////////////

// setup event handlers
window.onload = initPage;
window.onresize = resizePage;
