// page.js - progflow

var Page = function(url) {
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
    this.closeBtn.onclick = function(){document.body.removeChild(element);};
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
}

Page.prototype.show = function() {
    document.body.appendChild(this.element);
}

Page.prototype.close = function() {
    document.body.removeChild(this.element);
}

Page.prototype.goto = function(newurl) {
    // change the iframes location to the new url; we use its location history
    // to provide back functionality

    this.content.location = newurl;
}
