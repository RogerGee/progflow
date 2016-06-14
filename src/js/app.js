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
    mainPanel.addButtonA("break",buttonMakeBreakNode);
    mainPanel.addButtonA("ret",buttonMakeReturnNode);
    mainPanel.addButtonA("proc",buttonMakeProcNode);
    mainPanel.addBreak();
    mainPanel.addButtonB("rename proc",buttonRenameProc);
    mainPanel.addButtonB("delete block",buttonDeleteAction);
    mainPanel.addBreak();
    mainPanel.addButtonB("C++",buttonCppGen);
    mainPanel.addButtonB("Python",buttonPythonGen);
    mainPanel.addButtonB("exec",buttonExec);
    //mainPanel.addButtonB("trace");
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

// alert_ex() - better version of alert using our page system
function alert_ex(message) {
    var hd = document.createElement("h2");
    hd.innerHTML = "Message from web page...";

    var txt = document.createTextNode(message);
    var page = new CustomPage({content:[hd,txt],dims:{width:30,height:25}});
    page.show();
}

/////////////////////////////////////////////////,///////////////////////////////
// Button handlers for main UI
////////////////////////////////////////////////////////////////////////////////

function buttonNew() {
    // overwrite the current context with another one
    var canvas = document.getElementById("canvas-main");
    var canvasView = document.getElementById("div-canvas-view");

    // grab the name of the new project from the box
    var name = mainPanel.getElementValue("flowchart-name");
    if (name == "") {
        alert_ex("Please specify a project name in the input field at left.");
        return;
    }

    var warnDialog;
    function createNew() {
        context = new DrawingContext(canvas,canvasView,{label: name});
        context.drawScreen();

        if (typeof warnDialog != 'undefined')
            warnDialog.close();
    }

    if (context.isModified()) {
        var head = document.createElement('h1');
        var msg = document.createElement('p');

        head.innerHTML = "WARNING: Project is not saved!";
        msg.className = "new-proj-warning";
        msg.innerHTML = "You have modified the current project. "
            + "Creating a new project will overwrite your changes. Do you still "
            + "want to continue and lose your work?";

        warnDialog = new CustomPage({
            content:[head,msg],
            actions:[
                {label:"Create New Project Anyway",callback:createNew}
            ]
        });
        warnDialog.show();
    }
    else {
        createNew();
    }
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
                    var progrep;
                    var newcontext;
                    var canvas = document.getElementById("canvas-main");
                    var canvasView = document.getElementById("div-canvas-view");

                    try {
                        progrep = JSON.parse(e.target.result);
                        newcontext = new DrawingContext(
                            canvas,
                            canvasView,
                            progrep );
                    } catch (err) {
                        selectedFile = null;
                        lbl.className = "open-file-error-p";
                        lbl.innerHTML = "Failed to load input file: " + err;
                        return;
                    }

                    var nameBox = document.getElementById("flowchart-name");
                    nameBox.value = progrep.label;

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
            alert_ex("Please select a file.");
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

    var warnDialog;
    function closeProj() {
        context = new DrawingContext(canvas,canvasView,{label: "program"});
        nodePanel.innerHTML = '';

        if (typeof warnDialog != 'undefined')
            warnDialog.close();
    }

    if (context.isModified()) {
        var head = document.createElement('h1');
        var msg = document.createElement('p');

        head.innerHTML = "WARNING: Project is not saved!";
        msg.className = "new-proj-warning";
        msg.innerHTML = "You have unsaved changes in the current project. "
            + "Closing the project will destroy your changes. Do you still "
            + "want to continue and lose your work?";

        warnDialog = new CustomPage({
            content:[head,msg],
            actions:[
                {label:"Close Anyway",callback:closeProj}
            ]
        });
        warnDialog.show();
    }
    else {
        closeProj();
    }
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
    if (context.atTopLevel())
        return;
    if (!context.underLevel('main')) {
        alert_ex('Input blocks may only be added to the main procedure.');
        return;
    }
    context.addNode('flowin');
}

function buttonMakeOutNode() {
    if (context.atTopLevel())
        return;
    if (!context.underLevel('main')) {
        alert_ex('Output blocks may only be added to the main procedure.');
        return;
    }
    context.addNode('flowout');
}

function buttonMakeIfNode() {
    context.addNode('flowif');
}

function buttonMakeWhileNode() {
    context.addNode('flowwhile');
}

function buttonMakeBreakNode() {
    context.addNode('flowbreak');
}

function buttonMakeReturnNode() {
    context.addNode('flowret');
}

function buttonMakeProcNode() {
    if (!context.atTopLevel()) {
        alert_ex("You may only add procedures at the top-level.");
        return;
    }

    // add a procedure node whose name is unique
    context.addBlock('proc');
}

function buttonRenameProc() {
    var dialog;
    if (!context.atProcedureLevel()) {
        alert_ex("Procedure names must be modified at the procedure level.");
        return;
    }

    var procname = context.getCurBlockName();
    if (procname == "main") {
        alert_ex("Cannot rename 'main' procedure.");
        return;
    }

    var hd = document.createElement("h2");
    var label = document.createTextNode("Specify a unique identifier:");
    var entry = document.createElement('input');
    entry.type = 'text';
    entry.value = procname;
    hd.innerHTML = "Update Procedure Name";

    var updateName = function() {
        if (entry.value.match(IDENT_REGEX)[0] != entry.value) {
            alert_ex("Invalid procedure name");
            return;
        }

        if (!context.setCurBlockName(entry.value))
            alert_ex("Procedure name is already in use. Please specify a unique name.")
        else
            dialog.close();
    };

    // create a dialog to gather the new name
    dialog = new CustomPage(
        {
            actions:[{label:"Update",callback:updateName}],
            content:[hd,label,entry],
            dims:{width:30,height:20}
        });
    dialog.show();
}

function buttonDeleteAction() {
    context.deleteAction();
}

function buttonCppGen() {
    var rep = context.getSaveRep();
    var code = convCpp(rep);
    var dataURL = "data:text;charset=utf-8," + encodeURIComponent(code);
    var head = document.createElement('h1');
    var link = document.createElement('a');
    var codeBox = document.createElement('textarea');

    head.innerHTML = "Transliterated C++ Source Code";
    link.download = rep.label + ".cpp";
    link.href = dataURL;
    link.innerHTML = "Download C++ Source Code";
    codeBox.innerHTML = code;
    codeBox.className = "save-code-box";
    codeBox.readOnly = true;
    var dialog = new CustomPage({
        content:[head,codeBox,document.createElement("br"),link]
    });
    dialog.show();
}

function buttonPythonGen() {

}

function buttonExec() {
    var logic = context.entryPointLogic();

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
