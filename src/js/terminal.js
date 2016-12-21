// terminal.js - progflow

function Terminal(parentNode) {
    function TerminalLine(className) {
        var text = '';
        var curnode = document.createTextNode('');
        var span = document.createElement("span");
        span.appendChild(curnode);
        if (typeof className != 'undefined')
            span.className = className;

        this.addText = function(textParam) {
            text += textParam;
            curnode.data += textParam;
        };

        this.addFormattedText = function(textParam,format) {
            // create span for formatted text
            var subspan = document.createElement("span");
            if (format['color']) {
                subspan.style.color = format['color'];
            }
            if (format['bold']) {
                subspan.style.fontWeight = 'bold';
            }
            if (format['ul']) {
                subspan.style.textDecoration = 'underline';
            }

            // add the sub-span to the line
            text += textParam;
            subspan.appendChild(document.createTextNode(textParam));
            span.appendChild(subspan);

            // create new current text node context for future insertions
            curnode = document.createTextNode('');
            span.appendChild(curnode);
        }

        this.finish = function(breakLine) {
            if (typeof breakLine == 'undefined')
                breakLine = true;

            termDiv.appendChild(span);
            if (breakLine)
                termDiv.appendChild(document.createElement("br"));
            termDiv.scrollTop = termDiv.scrollHeight;
        }
    }

    // create terminal division
    var termDiv = document.createElement("div");
    termDiv.className = 'terminal';

    // create cursor element
    var cursor = document.createElement("span");
    var cursorText = document.createTextNode(' '); // single space character
    cursor.className = 'terminal-cursor';
    cursor.appendChild(cursorText);

    // define input mode state
    var imode = false;
    var imodeCb = null;
    var ispan = document.createElement("span");
    var ispanBefore = document.createTextNode(''); // before cursor
    var ispanAfter = document.createTextNode(''); // after cursor
    var itext = "";
    var ipos = 0;
    ispan.className = "terminal-input";
    ispan.appendChild(ispanBefore);
    ispan.appendChild(cursor);
    ispan.appendChild(ispanAfter);

    // modify our parent
    parentNode.appendChild(termDiv);
    parentNode.onfocus = onFocus;
    parentNode.onblur = onBlur;
    parentNode.onkeypress = onKeyPress;
    parentNode.onkeydown = onKeyDown;

    // onFocus() - handle changes when the terminal is focused
    function onFocus(e) {
        cursor.className = 'terminal-cursor';
    }

    // onBlur() - handle changes when the terminal loses focus
    function onBlur(e) {
        cursor.className = 'terminal-cursor terminal-cursor-nofocus';
    }

    // specialKey() - handle special key events
    function specialKey(e) {
        var code = 'which' in e ? e.which : e.keyCode;

        if (code == KEYCODES.ENTER) {
            e.preventDefault();
            imodeCb(endInputMode());

            return true;
        }
        else if (code == KEYCODES.LEFT) {
            // move the cursor left one position (if possible)
            if (ipos > 0) {
                ipos -= 1;

                // update cursor: the cursor will always assume a character from
                // the input text
                var before = itext.substr(0,ipos);
                var after = itext.substr(ipos,itext.length - ipos);
                ispanBefore.data = before;
                ispanAfter.data = after.substr(1);
                cursorText.data = after[0];
            }

            return true;
        }
        else if (code == KEYCODES.RIGHT) {
            // move the cursor right one position (if possible); the cursor may
            // sit at the first invalid position after the input text (where text
            // may be appended to the line)
            if (ipos < itext.length) {
                ipos += 1;

                // update cursor: the cursor may be in an invalid position, in
                // which case the space character MUST be set to its text node
                var before = itext.substr(0,ipos);
                var after = itext.substr(ipos,itext.length - ipos);
                ispanBefore.data = before;
                ispanAfter.data = after.substr(1);
                cursorText.data = ipos >= itext.length ? ' ' : after[0];
            }

            return true;
        }
        else if (code == KEYCODES.UP || code == KEYCODES.DOWN) {
            // no action as of now
            e.preventDefault();

            return true;
        }
        else if (code == KEYCODES.BACKSPACE) {
            // move the cursor back a position and remove the character at that
            // position
            if (ipos > 0) {
                ipos -= 1;

                var before = itext.substr(0,ipos);
                var after = itext.substr(ipos+1,itext.length - ipos);
                ispanBefore.data = before;
                ispanAfter.data = after.substr(1);
                itext = before + after;
                cursorText.data = ipos >= itext.length ? ' ' : after[0];
            }

            // prevent the browser from being stupid and navigating back
            e.preventDefault();

            return true;
        }
        else if (code == KEYCODES.HOME) {
            // place cursor at the beginning of a line
            ipos = 0;
            ispanBefore.data = "";
            ispanAfter.data = itext.substr(1);
            cursorText.data = itext[0];

            return true;
        }
        else if (code == KEYCODES.END) {
            // place cursor at the end of a line
            ipos = itext.length;
            ispanBefore.data = itext;
            ispanAfter.data = "";
            cursorText.data = " ";

            return true;
        }

        return false;
    }

    // onKeyDown() - some browsers require key down events for special keys
    function onKeyDown(e) {
        // do not handle key events when not in input mode
        if (!imode) {
            return;
        }

        // only handle special keys here
        specialKey(e);
    }

    // onKeyPress() - handle input key presses for text entry and control
    function onKeyPress(e) {
        var code = 'which' in e ? e.which : e.keyCode;

        // do not handle key presses if not in input mode
        if (!imode) {
            return;
        }

        // code should be zero if non-printing; filter out <enter> since it is
        // non-printing for our application
        if (code != 0 && code != KEYCODES.ENTER) {
            // insert character it into the input line text variable and also
            // update the span's elements for display
            var before = itext.substr(0,ipos) + String.fromCharCode(code); // insert before cursor
            var after = itext.substr(ipos,itext.length - ipos);
            itext = before + after;
            ispanBefore.data = before;
            ispanAfter.data = after.substr(1); // skip cursor character
            ipos += 1;
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // Public interface functions
    ////////////////////////////////////////////////////////////////////////////

    // addLine() - add text to the terminal at the current position and seek
    // to a new line
    function addLine(text,className) {
        var line = new TerminalLine(className);
        line.addText(text);
        line.finish();
    }
    this.addLine = addLine;

    // newLine() - creates a new TerminalLine object and returns it to the user
    function newLine(className) {
        var line = new TerminalLine(className);
        return line;
    }
    this.newLine = newLine;

    // inputMode() - sets the terminal to input mode; the callback is called once
    // the user has finished input; the terminal behaves canonically and returns
    // input after the user has finished entering a line
    function inputMode(callback) {
        imode = true;
        imodeCb = callback;

        // reset the state of the input line
        itext = "";
        ipos = 0;
        ispanBefore.data = "";
        ispanAfter.data = "";
        cursorText.data = " ";

        // add the input line span to the terminal screen
        termDiv.appendChild(ispan);
        termDiv.scrollTop = termDiv.scrollHeight;
        parentNode.focus(); // set focus so user knows input is requested
    }
    this.inputMode = inputMode;

    // endInputMode() - return the input gathered from the terminal thus far and
    // keep the input echoed in the terminal
    function endInputMode() {
        if (imode) {
            imode = false;
            termDiv.removeChild(ispan);
            addLine(itext,'terminal-input');
            return itext;
        }
    }

    // cancelInput() - cancels input mode (if on) and returns whatever input
    // the user has specified
    function cancelInput() {
        if (imode) {
            // exit input mode by toggling the flag and removing the input line
            // element from the terminal screen
            imode = false;
            termDiv.removeChild(ispan);
            return itext;
        }
    }
    this.cancelInput = cancelInput;

    this.clearScreen = function() {
        termDiv.innerHTML = '';
    }
}

// enumerate useful keycodes
const KEYCODES = {
    BACKSPACE: 8,
    COMMA: 188,
    DELETE: 46,
    DOWN: 40,
    END: 35,
    ENTER: 13,
    ESCAPE: 27,
    HOME: 36,
    LEFT: 37,
    NUMPAD_ADD: 107,
    NUMPAD_DECIMAL: 110,
    NUMPAD_DIVIDE: 111,
    NUMPAD_ENTER: 108,
    NUMPAD_MULTIPLY: 106,
    NUMPAD_SUBTRACT: 109,
    PAGE_DOWN: 34,
    PAGE_UP: 33,
    PERIOD: 190,
    RIGHT: 39,
    SPACE: 32,
    TAB: 9,
    UP: 38
};
