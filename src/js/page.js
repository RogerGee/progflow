// page.js - progflow

var Screen = function() {
    this.element = document.createElement('div');
    this.element.className = "screen";
};

Screen.prototype.show = function() {
    if ('screen' in this) {
        this.screen.show();
    }
    document.body.appendChild(this.element);
};

Screen.prototype.close = function() {
    if ('screen' in this) {
        this.screen.close();
    }
    document.body.removeChild(this.element);
}

// Page: a popup view that displays an HTML page and allows for navigation
var Page = function(url) {
    var thisobj = this;
    var firstPage = true;
    var element, content, backBtn;

    this.element = element = document.createElement('div');
    this.content = content = document.createElement('iframe');
    this.closeBtn = document.createElement('button');
    this.backBtn = backBtn = document.createElement('button');
    this.btnPanel = document.createElement('div');

    this.element.className = "page";
    this.content.className = "page-content"
    this.closeBtn.className = "page-button";
    this.backBtn.className = "page-button";
    this.btnPanel.className = "page-button-panel";
    this.closeBtn.innerHTML = "Close";
    this.closeBtn.onclick = function(){thisobj.close();};
    this.backBtn.innerHTML = "Back";
    this.backBtn.style.visibility = "hidden";
    this.backBtn.onclick = function() {
        content.contentWindow.history.back();
    };
    this.content.onload = function() {
        if (this.contentWindow.history.state == null) {
            this.contentWindow.history.replaceState(
                {first:firstPage},
                this.contentWindow.document.title,
                this.contentWindow.document.URL );
            if (!firstPage)
                backBtn.style.visibility = "visible";
            firstPage = false;
        }
        else {
            if (this.contentWindow.history.state.first)
                backBtn.style.visibility = "hidden";
            else
                backBtn.style.visibility = "visible";
        }
    };

    this.content.src = url;
    this.element.appendChild(this.content);
    this.btnPanel.appendChild(this.backBtn);
    this.btnPanel.appendChild(this.closeBtn);
    this.element.appendChild(this.btnPanel);

    this.screen = new Screen;
}

Page.prototype = Screen.prototype;

// CustomPage: an object similar to page but with custom content specified by
// a JavaScript object with the following attributes:
//  - actions: array of {label,callback} for action buttons at bottom of page
//  - content: array of HTML elements
//  - dims: object {width, height} for dimension percentages
var CustomPage = function(params) {
    var element;
    var thisobj = this;
    this.element = element = document.createElement('div');
    this.element.className = "page";
    if ('dims' in params) {
        var s = "width: " + params.dims.width + "%;height: "
            + params.dims.height + "%;" + "left: " + (100 - params.dims.width)/2
            + "%;top: " + (100 - params.dims.height)/2 + "%;";
        this.element.style = s;
    }

    this.btnPanel = document.createElement('div');
    this.btnPanel.className = "page-button-panel";

    this.closeBtn = document.createElement('button');
    this.closeBtn.className = "page-button";
    this.closeBtn.innerHTML = "Close";
    this.closeBtn.onclick = function(){thisobj.close();};

    this.content = document.createElement('div');
    this.content.className = "page-content";

    this.element.appendChild(this.content);
    this.element.appendChild(this.btnPanel);

    if ('actions' in params) {
        for (var action of params.actions) {
            var btn = document.createElement('button');
            btn.className = "page-button";
            btn.innerHTML = action.label;
            btn.onclick = action.callback;
            this.btnPanel.appendChild(btn);
        }
    }

    if ('content' in params) {
        for (var elem of params.content) {
            this.content.appendChild(elem);
        }
    }

    this.btnPanel.appendChild(this.closeBtn);
    this.screen = new Screen();
}

CustomPage.prototype = Screen.prototype;
