// drawing.js - progflow

const SELECT_COLOR = "#0000ff"; // color of selection background
const SELECT_ALPHA = 0.10; // percent of alpha component for selected drawables
const VISUAL_PADDING = 0.05; // how much padding in coordinates
const ONE_THIRD = 0.3333333333333333333333333; // we use this a lot
const ARROW_HEAD_ANGLE = 0.37887902; // angle of arrow head barbs from shaft
const ARROW_HEAD_LENGTH = 0.025; // length of arrow head
const ARROW_SHAFT_WIDTH = 0.001; // width of arrow shaft
const DEFAULT_FONT = "monospace";

function pnpoly(poly,x,y) {
    var c = false, n = poly.length / 2;
    for (var i = 0, j = n - 1;i < n;j = i++) {
        var vxi = poly[i*2], vyi = poly[i*2+1],
            vxj = poly[j*2], vyj = poly[j*2+1];

        if ((vyi > y != vyj > y) && (x < (vxj-vxi)*(y-vyi)/(vyj-vyi)+vxi)) {
            c = !c;
        }
    }
    return c;
}

function createVisual(ctx,kind,block,rep) {
    kind = kind.toLowerCase();

    if (kind == "flowblock") {
        return new FlowBlockVisual(ctx,"",block,rep);
    }
    if (kind == "flowoperation") {
        return new FlowOperationVisual(ctx,"",block,rep);
    }
    if (kind == "flowin") {
        return new FlowInOutVisual(ctx,"",block,"in",rep);
    }
    if (kind == "flowout") {
        return new FlowInOutVisual(ctx,"",block,"out",rep);
    }
    if (kind == 'flowif') {
        return new FlowIfVisual(ctx,"",block,rep);
    }
    if (kind == 'flowwhile') {
        return new FlowWhileVisual(ctx,"",block,rep);
    }

    return null;
}

////////////////////////////////////////////////////////////////////////////////
// DrawingContext - handles top-level drawing operations
////////////////////////////////////////////////////////////////////////////////

function DrawingContext(canvas,canvasView,program) {
    var ctx = canvas.getContext("2d"); // HTML5 Canvas context
    // block for all program elements
    var topBlock;
    var currentBlock;
    var blockStack = [];
    var modified;

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    // resizeCanvas() - this sizes the canvas so that it fits into the space provided
    // for it (i.e. the canvas view)
    function resizeCanvas() {
        var height = currentBlock.getHeight();

        // use the canvas view's dimensions as a starting point; factor out any
        // initial scroll height from the view
        canvas.width = canvasView.clientWidth;
        canvas.height = canvasView.clientHeight/2 * height;
        canvas.height -= canvasView.scrollHeight - canvas.clientHeight;

        // compute padding amounts according to the aspect ratio of the canvas
        // view and assign the results to the canvas context for later lookup
        var px, py;
        px = py = VISUAL_PADDING;
        ctx.aspectRatio = canvasView.clientHeight / canvasView.clientWidth;
        px *= ctx.aspectRatio;
        ctx.paddingX = px;
        ctx.paddingY = py;

        // perform a draw screen to make the changes apparent
        drawScreen();
    }

    // drawScreen() - perform all the drawing on the canvas
    function drawScreen() {
        // clear any existing transformation
        ctx.setTransform(1,0,0,1,0,0);

        // fill background
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "#000000";

        // set up a coordinate system such that the ranges x:[-1,1] and y:[-1,x-1]
        // map to the entire surface of the canvas where x is the height
        var height = currentBlock.getHeight();
        var hw = canvas.width / 2, hh = canvas.height / 2;
        ctx.translate(hw,hh); // translate to center of canvas
        ctx.scale(canvas.width/(2+VISUAL_PADDING),canvas.height/(height+VISUAL_PADDING));
        ctx.translate(0,-height/2+1); // adjust y such that there is one unit up

        // render all of the drawable objects in our possession which fall under
        // the currently selected block
        currentBlock.draw();
    }

    // drawPolygon() - draws a series of connected line segments to form a
    // polygon; any drawing attributes should be inherited
    function drawPolygon(coords) {
        ctx.beginPath();
        ctx.moveTo(coords[0],coords[1]);
        for (var i = 2;i < coords.length-1;i+=2) {
            ctx.lineTo(coords[i],coords[i+1]);
        }
        ctx.closePath();
    }

    // drawArrow() - renders a simple arrow graphic with the arrow head at the
    // 'end' position
    function drawArrow(start,end,fill) {
        if (fill === undefined) {
            fill = true;
        }

        var v = {}, m, d, a, b;
        var head = [], headLength;
        var sx = canvas.width / 2;
        var sy = canvas.height / currentBlock.getHeight();

        function makeVector(dir,len) {
            if (len === undefined) {
                len = 1;
            }

            var vector = {};
            vector.x = Math.cos(dir) * len;
            vector.y = Math.sin(dir) * len;
            return vector;
        }

        // change coordinate systems to avoid distortion; use one that preserves
        // the aspect ratio by making each unit as close as possible to a pixel
        // so that the fractional parts of each unit don't distort the image
        ctx.save();
        headLength = ARROW_HEAD_LENGTH * sx;
        ctx.scale(1/sx,1/sy);
        start[0] *= sx; end[0] *= sx;
        start[1] *= sy; end[1] *= sy;

        // find arrow vector and normalize it to the length of the arrow head
        v.x = start[0] - end[0];
        v.y = start[1] - end[1];
        m = Math.sqrt(v.x*v.x + v.y*v.y);
        v.x = v.x/m * headLength;
        v.y = v.y/m * headLength;
        d = Math.atan2(v.y,v.x);
        m = Math.abs(headLength / Math.cos(ARROW_HEAD_ANGLE)); // length of head sides

        // find the vectors representing the sides of the arrow head
        var v1 = makeVector(d+ARROW_HEAD_ANGLE,m);
        var v2 = makeVector(d-ARROW_HEAD_ANGLE,m);

        // compute head coordinates and draw the resulting polygon
        head.push(
            end[0], end[1],
            end[0] + v1.x, end[1] + v1.y,
            end[0] + v2.x, end[1] + v2.y );
        drawPolygon(head);
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        if (fill)
            ctx.fill();
        else {
            ctx.lineWidth = 1.0;
            ctx.stroke();
        }
        ctx.restore();

        // draw the line
        drawPolygon([start[0],start[1],end[0]+v.x,end[1]+v.y]);
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        ctx.restore(); // return to original coordinate system
    }

    // drawText() - draws text within max width at the location x,y; y is the
    // center of the line of text; if center is true then the text is centered
    // around x,y
    function drawText(txt,x,y,maxWidth,fontHeight,center) {
        if (center === undefined) {
            center = false;
        }

        // we need to scale the coordinate space in order to obtain the correct
        // max width and font height (i.e. sizes)
        var sx = canvas.width / 2;
        var sy = canvas.height / currentBlock.getHeight();

        if (center) {
            ctx.textAlign = "center";
        }
        else {
            ctx.textAlign = "start";
        }
        ctx.textBaseline = "middle"; // thank God for this

        // scale the context to undo the initial transformations; make sure
        // the scaling doesn't affect the specified text position
        ctx.save();
        ctx.scale(1/sx,1/sy);
        x *= sx; y *= sy;
        maxWidth *= sx; // this value converted to "scaled pixels"

        // the font is specified in pixels that are scaled; the transformations
        // take the font height from the calling context's coordinate space and
        // transforms it into units of "scaled pixels"
        var fontSz = fontHeight * sy;
        ctx.font = fontSz + "px " + DEFAULT_FONT;
        ctx.fillText(txt,x,y,maxWidth);

        ctx.restore();
    }

    // textWidth() - determine the width of a line of text (i.e. the text that
    // would be drawn with drawText()); the resulting width is in units of the
    // current coordinate space
    function textWidth(txt,fontHeight) {
        var w;
        var sx = canvas.width / 2;
        var sy = canvas.height / currentBlock.getHeight();
        var fontSz = fontHeight * sy;

        ctx.save();
        ctx.scale(1/sx,1/sy);
        ctx.font = fontSz + "px " + DEFAULT_FONT;
        w = ctx.measureText(txt).width;
        ctx.restore();

        return w / sx;
    }

    // drawLine() - draw a line similar to the line drawn with drawArrow()
    function drawLine(a,b) {
        drawPolygon(Array.prototype.concat(a,b));
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    // addBlock() - create new procedure block under top-block; this is used to
    // add top-level procedure visuals to the context
    function addBlock(label) {
        var element = new FlowBlockVisual(ctx,label); // has no parent logic to inherit
        element.setHeightChangeCallback(resizeCanvas);
        topBlock.addChild(element);
        modified = true;
        drawScreen();
        return element;
    }

    // saveBlock() - saves the current block and changes the current to the
    // specified block visual
    function saveBlock(block) {
        if (typeof block.setIcon == 'undefined')
            // 'block' is not a block visual
            return;
        if (currentBlock.isChildToggled())
            // block has toggled child
            return;
        currentBlock.setIcon(true);
        blockStack.push(currentBlock);
        currentBlock = block;
        block.setIcon(false);
        resizeCanvas(); // this redraws the screen
    }

    // restoreBlock() - restores the previous current block; no child elements
    // may be toggled for this operation to succeed
    function restoreBlock() {
        if (blockStack.length > 0 && !currentBlock.isChildToggled()) {
            currentBlock.setIcon(true);
            currentBlock = blockStack.pop();
            currentBlock.setIcon(false);
            resizeCanvas(); // this redraws the screen
            return true;
        }
        return false;
    }

    // addNode() - creates and adds a child visual to the current block; the
    // current block must not be the top block
    function addNode(kind) {
        var node = null;

        // must not be in top block scope
        if (currentBlock === topBlock)
            return;

        // create node based on kind; it gets a reference to the current block's
        // logic object
        node = createVisual(ctx,kind,currentBlock.getLogic());

        if (node != null) {
            modified = true;
            currentBlock.addChild(node);
            drawScreen();
        }
    }

    // onCanvasClick() - called when the user clicks the canvas
    function onCanvasClick(args) {
        // correct the coordinates: this will also account for any overflow
        // applied to the canvas
        var cx = args.clientX, cy = args.clientY;
        var rect = canvas.getBoundingClientRect();
        cx -= rect.left; cy -= rect.top;

        // transform pixel coordinates according to how we transform the current
        // block visual in drawScreen(); this the opposite of that transformation
        var height = currentBlock.getHeight();
        var hw = canvas.width / 2, hh = canvas.height / 2;
        cx -= hw; cy -= hh;
        cx /= canvas.width/(2+VISUAL_PADDING); cy /= canvas.height/(height+VISUAL_PADDING);
        cx -= 0; cy -= -height/2+1;

        // see if a child element was clicked; if a block was clicked and is
        // current then push back to previous context; otherwise push forward
        // to a new context
        var elem = currentBlock.onclick(cx,cy);
        if (elem != null) {
            if (elem === currentBlock)
                restoreBlock();
            else if (typeof elem.type != "undefined" && elem.type == "block")
                saveBlock(elem);
            if (typeof elem.ontoggle != "undefined") {
                currentBlock.clearToggleExcept(elem); // make sure only one child is selected
                elem.ontoggle();
                drawScreen();
            }
        }
    }

    function onCanvasKeyUp(e) {
        var code = 'which' in e ? e.which : e.keyCode;
        if (code == KEYCODES.DELETE) {
            currentBlock.ondelete();
        }
    }

    // topLevelLogic() - gets the top-level logic object
    function topLevelLogic() {
        var lo = topBlock.getLogic();
        var main = lo.findBlock('main');
        if (main == null)
            throw "'main' block wasn't found!";
        return main;
    }

    // getSaveRep() - gets the save representation of the current program as a
    // JavaScript object
    function getSaveRep() {
        return topBlock.getRep();
    }

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    this.resizeCanvas = resizeCanvas;
    this.drawScreen = drawScreen;
    this.addBlock = addBlock;
    this.saveBlock = saveBlock;
    this.restoreBlock = restoreBlock;
    this.addNode = addNode;
    this.topLevelLogic = topLevelLogic;
    this.getSaveRep = getSaveRep;
    this.isModified = function(){return modified;};
    this.unmodified = function(){modified = false;};
    ctx.drawPolygon = drawPolygon;
    ctx.drawArrow = drawArrow;
    ctx.drawText = drawText;
    ctx.drawLine = drawLine;
    ctx.textWidth = textWidth;
    ctx.onmodify = function(){modified = true;};
    canvas.onclick = onCanvasClick;
    canvasView.onkeyup = onCanvasKeyUp; // the view has input focus
    this.deleteAction = function(){currentBlock.ondelete();};

    topBlock = currentBlock = new FlowBlockVisual(ctx,program.label);
    topBlock.setHeightChangeCallback(resizeCanvas);
    topBlock.setIcon(false);
    if (typeof program.children != 'undefined') {
        // load from save representation
        program.hccb = resizeCanvas; // children must be able to resize notify
        topBlock.loadFromRep(program);
    }
    else {
        addBlock("main");
    }
    resizeCanvas();
    modified = false;
}

/* Visuals -

    Visuals represent the set of rendered elements used to compose a program
    flow diagram. Each object takes a label that may be left empty, a reference
    to a flow-block object that may be null and an optional 'rep' object that
    specifies how the visual is to be constructed. Each object implements the
    following methods:
        - draw: render the visual
        - onclick: get element that was clicked given coordinates
        - getHeight: get number of units in visual's height
        - setHeightChangeCallback: set a callback to be called whenever the
            visual's height changes [optional]
        - getBounds: get coordinate bounds given "upper", "lower", "left", "right",
            ETC.
        - ontoggle: called when a click event occurred on the visual [optional]
        - istoggled: called to ask if a visual is toggled [optional]
        - set/getLabel: manipulate visual text
        - getRep: get save representation of object
*/

////////////////////////////////////////////////////////////////////////////////
// FlowBlockVisual - represents the visual component of a block of program flow
// diagram elements rendered on the screen
////////////////////////////////////////////////////////////////////////////////

function FlowBlockVisual(ctx,label,block,rep) {
    var children = []; // list of child drawables
    var iconified = true; // whether or not is iconified (i.e. made small)
    var maxy = 1.0; // max y-coordinate for our coordinate system
    var adjustHeight = null; // callback for height adjustment notification
    var logic; // logic state of visual

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    function draw() {
        // draw the box representing the block
        ctx.save();
        ctx.drawPolygon(getBounds());
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        ctx.setLineDash([2,5]);
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.restore();
        if (label != "") {
            if (!iconified) {
                // draw label in upper-left corner; we must position the text at
                // least half the font height down from the top; since the visual
                // is uniconified, then draw the label out of the way
                ctx.drawText(label,-0.99,-0.925,2.0,0.15);
            }
            else {
                // the visual is small so draw text over the visual's entire surface
                ctx.drawText(label,0.0,0.0,2.0,1.0,true);
                ctx.globalAlpha = 0.5; // make sub-visuals a little lighter
            }
        }

        // render our children inside our rectangle
        var ty = -1+ONE_THIRD;
        var last = null, lastTy = null;
        for (var obj of children) {
            // obtain the child's height; we must multiply it by 1/3 since the
            // child will be scaled by that factor
            var h = obj.getHeight() * ONE_THIRD, hh = h/2;
            var s = 1-VISUAL_PADDING/hh;
            ctx.save();

            // translate to the center of the object (using its half-height);
            // then scale by a factor that produces the visual padding; then
            // translate by the current offset from the top and scale by 1/3
            // (that will be the default height for a child element)
            ctx.translate(0,ty);
            ctx.translate(0,hh-ONE_THIRD);
            ctx.scale(s,s);
            ctx.translate(0,-hh+ONE_THIRD);
            ctx.scale(ONE_THIRD,ONE_THIRD);

            // draw the sub-visual
            obj.draw();
            ctx.restore();

            // draw connection arrow from last object to this one (this may do
            // nothing if the implementation of the visual doesn't specify arrows)
            if (last != null)
                connect(ctx,last,obj,lastTy,ty);
            last = obj;
            lastTy = ty;

            // advance to next vertical position; we o
            ty += h;
        }

        ctx.restore();
    }

    // connect() - draw an arrow between two different visual elements; they may
    // specify via getBounds('arrowUpper') and getBounds('arrowLower') one of:
    //  y           - position is (0,y)
    // [x,y]        - position is (x,y)
    // [[x1,y1],... - positions are (x1,y1), ...
    function connect(ctx,a,b,off1,off2) {
        var bu = b.getBounds("arrowUpper");
        var bl = a.getBounds("arrowLower");

        // a visual may not define arrow bounds (meaning an arrow shouldn't be drawn)
        // if it returns nothing for the arrow bounds
        if (bu == null || bl == null)
            return;

        if (!Array.isArray(bu))
            bu = [bu];
        if (!Array.isArray(bl))
            bl = [bl];

        for (var i = 0;i < bu.length;++i) {
            for (var j = 0;j < bl.length;++j) {
                var hx, hy, tx, ty;
                if (Array.isArray(bu[i])) {
                    hx = bu[i][0];
                    hy = bu[i][1];
                }
                else {
                    hx = 0;
                    hy = bu[i];
                }
                if (Array.isArray(bl[j])) {
                    tx = bl[j][0];
                    ty = bl[j][1];
                }
                else {
                    tx = 0;
                    ty = bl[j];
                }

                // perform the same transformations that draw() does but with a different
                // translation for the head and tail (this does not include the padding
                // transformations)
                hx *= ONE_THIRD; tx *= ONE_THIRD;
                hy *= ONE_THIRD; hy += off2;
                ty *= ONE_THIRD; ty += off1;

                ctx.drawArrow([tx,ty],[hx,hy]);
            }
        }
    }

    // onclick() - return the child element that was clicked; x and y are coordinates
    // in the space we receive from our parent; if no direct child element was
    // found and the coordinates lie within our bounds, then return 'this'
    function onclick(x,y) {
        // only select child elements if we are not iconified
        if (!iconified) {
            // go through each of the children and see if they were clicked; make
            // sure to transform the coordinate relative to each child's coord space
            var ty = -1+ONE_THIRD;

            for (var obj of children) {
                var h = obj.getHeight() * ONE_THIRD, hh = h/2;
                var cx = x/ONE_THIRD/(1-VISUAL_PADDING/hh);
                var cy = (y - ty) / ONE_THIRD / (1-VISUAL_PADDING/hh);

                // call 'onclick()' on the child element so it can bounds check itself
                // and any children it might have
                var result = obj.onclick(cx,cy);
                if (result != null) {
                    return result;
                }

                ty += h;
            }
        }

        if (x >= getBounds("left") && x <= getBounds("right")
            && y >= getBounds("upper") && y <= getBounds("lower"))
        {
            return this;
        }

        return null;
    }

    // ondelete() - delete any currently selected child from our list of children
    function ondelete() {
        var index = getToggledIndex();
        if (index >= 0) {
            children[index].ontoggle();
            children.splice(index,1);
            ctx.onmodify();
            recalcHeight(); // this will redraw the screen
        }
    }

    // getHeight() - we need to be able to export our height to somebody else;
    // the height value is how many y-units we have (which is always one more than
    // the maximum positive y coordinate available)
    function getHeight() {
        return maxy + 1;
    }

    // setHeightChangeCallback() - sets the height change callback that is called
    // whenever the visual's height changes
    function setHeightChangeCallback(callback) {
        adjustHeight = callback;
    }

    // setIcon() - tells the block visual what it's iconified status should be,
    // this changes the behavior of the visual element
    function setIcon(value) {
        iconified = value;

        // this should toggle our block logic; the block is considered selected
        // if it is not iconified
        logic.ontoggle(!iconified);
    }

    // addChild() - add a child element to the block; adjust our size if needed;
    // the child is added to the end or directly after the currently selected
    // element
    function addChild(child) {
        if (typeof child.setHeightChangeCallback != "undefined")
            child.setHeightChangeCallback(recalcHeight);

        var index = getToggledIndex();
        if (index == -1) {
            // insert at end
            children.push(child);
        }
        else {
            // insert (before) selected position
            children.splice(index,0,child);
            if (typeof child.ontoggle != "undefined") {
                // untoggle current child and select the new one
                children[index+1].ontoggle(); // must be toggleable
                child.ontoggle();
            }
        }
        ctx.onmodify();

        recalcHeight();
    }

    // recalcHeight() - recalculate the height of the visual based on the heights
    // of its child visuals
    function recalcHeight() {
        // each child element will normally take up 2/3 units
        var y = -1;
        for (var obj of children) {
            // each child lives in its own coordinate system that was scaled by
            // one-third
            y += obj.getHeight() * ONE_THIRD;
        }

        if (y > 1.0) {
            maxy = y;
        }
        else {
            // the height may have decreased below 1.0
            maxy = 1.0;
        }

        if (adjustHeight != null) {
            adjustHeight(); // propogate the change back up to our parent
        }
    }

    // removeChild() - remove specified child visual from the child collection
    function removeChild(child) {
        var index = children.indexOf(child);
        if (index >= 0) {
            children.splice(index,1);
            recalcHeight();
        }
    }

    // getBounds() - gets bounding box info for visual; the block visual doesn't
    // support arrows so arrow bounds are undefined
    function getBounds(kind) {
        if (typeof kind == "undefined")
            return [-1,-1, 1,-1, 1,maxy, -1,maxy];
        if (kind == "upper")
            return -1;
        if (kind == "lower")
            return maxy;
        if (kind == "left")
            return -1;
        if (kind == "right")
            return 1;
        return null;
    }

    // isChildToggled() - determines if a child has been toggled
    function isChildToggled() {
        for (var obj of children) {
            if (typeof obj.isToggled != "undefined")
                if (obj.isToggled())
                    return true;
        }
        return false;
    }

    // getToggledIndex() - returns the index of the currently toggled child visual
    // or -1 if no child element is toggled
    function getToggledIndex() {
        var i = 0;
        for (var obj of children) {
            if (typeof obj.isToggled != "undefined" && obj.isToggled())
                return i;
            i += 1;
        }
        return -1;
    }

    // untoggleChild() - untoggles the currently selected child (if any)
    function clearToggleExcept(unless) {
        for (var obj of children) {
            if (typeof unless == "undefined" || obj !== unless)
                if (obj.isToggled())
                    obj.ontoggle();
        }
    }

    // forEachChild() - execute a callback for each child element
    function forEachChild(callback) {
        for (var obj of children) {
            if (!callback(obj))
                break;
        }
    }

    // nextChild() - grab a reference to the next child based on a user-supplied
    // iterator; the iterator is an object with an 'iter' integer property
    function nextChild(iter) {
        if (iter.iter >= children.length) {
            // we don't reset the iterator here; the user should create a new iterator
            return null;
        }

        return children[iter.iter++];
    }

    // getRep() - get save representation JavaScript object of the visual/logic
    function getRep() {
        var o = {
            label: label,
            logic: logic.getRep(),
            children: [],
            kind: 'flowblock'
        };

        for (var child of children) {
            o.children.push(child.getRep());
        }

        return o;
    }

    function loadFromRep(rep) {
        setHeightChangeCallback(rep.hccb);
        label = rep.label;
        logic = new FlowBlockLogic(this,block,rep.logic);
        if ('children' in rep) {
            for (var i of rep.children) {
                i.hccb = recalcHeight; // children must be able to resize notify
                children.push(createVisual(ctx,i.kind,logic,i));
            }
            recalcHeight();
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    this.draw = draw;
    this.getHeight = getHeight;
    this.setHeightChangeCallback = setHeightChangeCallback;
    this.getBounds = getBounds;
    this.setIcon = setIcon;
    this.addChild = addChild;
    this.removeChild = removeChild;
    this.getLogic = function(){return logic;};
    this.isToggled = function(){return !iconified;};
    this.isChildToggled = isChildToggled;
    this.clearToggleExcept = clearToggleExcept;
    this.onclick = onclick;
    this.ondelete = ondelete;
    this.type = 'block';
    this.getLabel = function(){return label;};
    this.setLabel = function(text){label = text; ctx.onmodify();};
    this.forEachChild = forEachChild;
    this.nextChild = nextChild;
    this.newChildIter = function(){return {iter:0}};
    this.getRep = getRep;
    this.loadFromRep = loadFromRep;

    if (typeof rep != 'undefined') {
        this.loadFromRep(rep);
    }
    else {
        logic = new FlowBlockLogic(this,block);
    }
}

////////////////////////////////////////////////////////////////////////////////
// FlowOperationVisual - represents a visual element representing a mathematical
// operation in the program
////////////////////////////////////////////////////////////////////////////////

function FlowOperationVisual(ctx,label,block,rep) {
    var logic; // visual logic object
    var selected = false; // has the visual been selected?
    var wbound = 1; // absolute value of width bound

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    // draw() - main drawing operation
    function draw() {
        ctx.drawPolygon(getBounds());
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        if (selected) {
            ctx.fillStyle = SELECT_COLOR;
            ctx.globalAlpha = SELECT_ALPHA;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.restore();
        if (label != "") {
            // draw label in center: maxWidth should be the width of the polygon
            // drawn above; fontHeight should be half the height of the polygon
            ctx.drawText(label,0,0,getBounds('right') - getBounds('left'),0.5,true);
        }
    }

    // ontoggle() - toggle select status of object and invoke logic object event
    function ontoggle() {
        selected = !selected;
        logic.ontoggle(selected);
    }

    // getHeight() - every operation element will use 2 units (-1 to 1)
    function getHeight() {
        return 2;
    }

    // getBounds() - gets the bounds of the visual's bounding box
    function getBounds(kind) {
        if (kind == "upper" || kind == "arrowUpper")
            return -0.5;
        if (kind == "lower" || kind == "arrowLower")
            return 0.5;
        if (kind == "left")
            return -wbound;
        if (kind == "right")
            return wbound;
        if (typeof kind == "undefined")
            return [-wbound,-0.5,wbound,-0.5,wbound,0.5,-wbound,0.5];
        return null;
    }

    // onclick(x,y) - see if the click was inside our region
    function onclick(x,y) {
        if (x >= getBounds("left") && x <= getBounds("right")
            && y >= getBounds("upper") && y <= getBounds("lower"))
        {
            return this;
        }

        return null;
    }

    // setLabel: set the label for the visual and potentially resize it
    function setLabel(text) {
        label = text;
        var w = ctx.textWidth(label,0.5);
        if (w > 6) // there are 6 units across the screen
            w = 6;
        if (w < 2)
            w = 2;
        wbound = w / 2;
        ctx.onmodify();
    }

    // getRep() - get save representation
    function getRep() {
        return {logic: logic.getRep(), kind: 'flowoperation'};
    }

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    this.draw = draw;
    this.ontoggle = ontoggle;
    this.getHeight = getHeight;
    this.getBounds = getBounds;
    this.onclick = onclick;
    this.isToggled = function(){return selected;};
    this.getLogic = function(){return logic;};
    this.getLabel = function(){return label;};
    this.setLabel = setLabel;
    this.getRep = getRep;
    this.type = 'operation';

    if (typeof rep != 'undefined') {
        logic = new FlowOperationLogic(this,block,rep.logic);
    }
    else {
        logic = new FlowOperationLogic(this,block);
    }
}

////////////////////////////////////////////////////////////////////////////////
// FlowInOutVisual - represents a visual element that supplies either input or
// output functionality
////////////////////////////////////////////////////////////////////////////////

function FlowInOutVisual(ctx,label,block,param,rep) {
    var logic;
    var selected = false;
    var wbound = 1;

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    function draw() {
        ctx.drawPolygon(getBounds());
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        if (selected) {
            ctx.fillStyle = SELECT_COLOR;
            ctx.globalAlpha = SELECT_ALPHA;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.restore();

        var w = getBounds('right') - getBounds('left');
        ctx.drawText(param,-wbound+.075,-0.3,w,0.25);
        if (label != "")
            ctx.drawText(label,0,0,w,0.5,true);
    }

    function ontoggle() {
        selected = !selected;
        logic.ontoggle(selected);
    }

    function onclick(x,y) {
        // run pnpoly to see if the shape was clicked
        return pnpoly(getBounds(),x,y) ? this : null;
    }

    function getHeight() {
        return 2;
    }

    function getBounds(kind) {
        if (kind == "upper" || kind == "arrowUpper")
            return -0.5;
        if (kind == "lower" || kind == "arrowLower")
            return 0.5;
        if (kind == "left")
            return -wbound + .05;
        if (kind == "right")
            return wbound - .05;
        if (typeof kind == "undefined")
            return [-wbound+.05,-0.5,wbound,-0.5,wbound-.05,0.5,-wbound,0.5];
        return null;
    }

    function setLabel(text) {
        label = text;
        var w = ctx.textWidth(label,0.5);
        if (w > 6) // there are 6 units across the screen
            w = 6;
        if (w < 2)
            w = 2;
        wbound = w / 2;
        ctx.onmodify();
    }

    function getRep() {
        return {logic: logic.getRep(), kind: 'flow'+param};
    }

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    this.draw = draw;
    this.ontoggle = ontoggle;
    this.onclick = onclick;
    this.getHeight = getHeight;
    this.getBounds = getBounds;
    this.isToggled = function(){return selected;};
    this.getLogic = function(){return logic;};
    this.getLabel = function(){return label;};
    this.setLabel = setLabel;
    this.getRep = getRep;
    this.type = 'inout';

    if (typeof rep != 'undefined') {
        logic = new FlowInOutLogic(this,block,param,rep.logic);
    }
    else {
        logic = new FlowInOutLogic(this,block,param);
    }
}

////////////////////////////////////////////////////////////////////////////////
// FlowIfVisual
////////////////////////////////////////////////////////////////////////////////

function FlowIfVisual(ctx,label,block,rep) {
    var selected = false;
    var logic;
    var truePart;
    var falsePart;

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    function draw() {
        ctx.drawPolygon(getBounds());
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        if (selected) {
            ctx.fillStyle = SELECT_COLOR;
            ctx.globalAlpha = SELECT_ALPHA;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.restore();

        var w = getBounds('right') - getBounds('left');
        ctx.drawText('if',0,-0.15,w,0.25,true);
        ctx.drawText(label,0,0.5,w,0.25,true);

        // draw true and false blocks as well as lower lines after the blocks
        ctx.save();
        ctx.drawLine([-1,0.5],[-2,0.5]);
        ctx.drawLine([1,0.5],[2,0.5]);
        ctx.save();
        ctx.scale(3,3); // undo our parent's ONE_THIRD scaling to make arrow head
                        // size consistent with parent's rendering
        ctx.drawArrow([-2/3,0.5/3],[-2/3,2/3]);
        ctx.drawArrow([2/3,0.5/3],[2/3,2/3]);
        ctx.restore();

        ctx.translate(-2,3); // translate to center for 'truePart'
        truePart.draw();

        var y1, y2, y3;
        y1 = truePart.getBounds('lower'), y2 = getBounds('arrowLower')-3;
        y3 = falsePart.getBounds('lower');

        ctx.drawLine([0,y1],[0,y2]);
        ctx.translate(4,0); // translate to center for 'falsePart'
        ctx.drawLine([0,y3],[0,y2]);
        ctx.drawLine([0,y2],[-4,y2]);
        ctx.drawLine([-2,y2],[-2,y2+0.15]);

        falsePart.draw();
        ctx.restore();
    }

    function ontoggle() {
        selected = !selected;
        logic.ontoggle(selected);
    }

    function onclick(x,y) {
        // run pnpoly to see if the shape was clicked
        if (pnpoly(getBounds(),x,y))
            return this;

        // see if either true part or false part was clicked
        var r;
        if ((r = truePart.onclick(x+2,y-3)) != null)
            return r;
        return falsePart.onclick(x-2,y-3);
    }

    function getHeight() {
        return 4 + Math.max(truePart.getHeight(),falsePart.getHeight());
    }

    function getBounds(kind) {
        if (kind == "upper" || kind == "arrowUpper")
            return -0.95;
        if (kind == "lower" || kind == "arrowLower")
            return getHeight()-1;
        if (kind == "left")
            return -.95;
        if (kind == "right")
            return .95;
        if (typeof kind == "undefined")
            return [-.95,0.5,0.0,-0.95,.95,0.5,0.0,1.95];
        return null;
    }

    // setHeightChangeCallback() - we need to know what to do when we resize; we
    // resize only when 'truePart' or 'falsePart' resizes
    function setHeightChangeCallback(callback) {
        // pass the callback along to the sub blocks
        truePart.setHeightChangeCallback(callback);
        falsePart.setHeightChangeCallback(callback);
    }

    function getRep() {
        return {
            truePart: truePart.getRep(), falsePart: falsePart.getRep(),
            logic: logic.getRep(), kind: 'flowif'
        };
    }

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    this.draw = draw;
    this.ontoggle = ontoggle;
    this.onclick = onclick;
    this.getHeight = getHeight;
    this.getBounds = getBounds;
    this.setHeightChangeCallback = setHeightChangeCallback;
    this.isToggled = function(){return selected;};
    this.getLogic = function(){return logic;};
    this.getLabel = function(){return label;};
    this.setLabel = function(text){label = text; ctx.onmodify();};
    this.getTruePart = function(){return truePart;};
    this.getFalsePart = function(){return falsePart;};
    this.getRep = getRep;
    this.type = 'if';

    if (typeof rep != 'undefined') {
        rep.truePart.hccb = rep.falsePart.hccb = rep.hccb; // copy resize notify callback
        truePart = new FlowBlockVisual(ctx,"true",block,rep.truePart);
        falsePart = new FlowBlockVisual(ctx,"false",block,rep.falsePart);
        logic = new FlowIfLogic(this,block,rep.logic);
    }
    else {
        truePart = new FlowBlockVisual(ctx,"true",block);
        falsePart = new FlowBlockVisual(ctx,"false",block);
        logic = new FlowIfLogic(this,block);
    }
}

////////////////////////////////////////////////////////////////////////////////
// FlowWhileVisual
////////////////////////////////////////////////////////////////////////////////

function FlowWhileVisual(ctx,label,block,rep) {
    var selected = false;
    var logic;
    var body;

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    function draw() {
        ctx.drawPolygon(getBounds());
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        if (selected) {
            ctx.fillStyle = SELECT_COLOR;
            ctx.globalAlpha = SELECT_ALPHA;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.restore();

        var w = getBounds('right') - getBounds('left');
        ctx.drawText('while',0,-0.15,w,0.25,true);
        ctx.drawText(label,0,0.5,w,0.25,true);

        // draw arrow from while block to body block
        ctx.save();
        ctx.drawLine([1,0.5],[2,0.5]);
        ctx.save();
        ctx.scale(3,3); // undo our parent's ONE_THIRD scaling to make arrow head
                        // size consistent with parent's rendering
        ctx.drawArrow([2/3,0.5/3],[2/3,2/3]);
        ctx.restore();

        // draw the body
        ctx.translate(2,3);
        body.draw();

        // draw the loop arrow
        var y1, y2
        y1 = body.getBounds('lower');
        y2 = getBounds('lower')-3;
        ctx.drawLine([0,y1],[0,y2]);
        ctx.drawLine([0,y2],[-1.5,y2]);
        ctx.drawLine([-2,y2+0.15],[-2,-1]);
        ctx.scale(3,3);
        ctx.drawArrow([-1.5/3,y2/3],[-1.5/3,-ONE_THIRD]);
        ctx.restore();
    }

    function ontoggle() {
        selected = !selected;
        logic.ontoggle(selected);
    }

    function onclick(x,y) {
        // run pnpoly to see if the shape was clicked
        if (pnpoly(getBounds(),x,y))
            return this;

        // see if the body was clicked
        return body.onclick(x-2,y-3);
    }

    function getHeight() {
        return 4 + body.getHeight();
    }

    function getBounds(kind) {
        if (kind == "upper" || kind == "arrowUpper")
            return -0.95;
        if (kind == "lower" || kind == "arrowLower")
            return getHeight()-1;
        if (kind == "left")
            return -.95;
        if (kind == "right")
            return .95;
        if (typeof kind == "undefined")
            return [-.95,0.5,0.0,-0.95,.95,0.5,0.0,1.95];
        return null;
    }

    // setHeightChangeCallback() - we need to know what to do when we resize; we
    // resize only when body resizes
    function setHeightChangeCallback(callback) {
        // pass the callback along to the sub blocks
        body.setHeightChangeCallback(callback);
    }

    function getRep() {
        return {body: body.getRep(), logic: logic.getRep(), kind: 'flowwhile'};
    }

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    this.draw = draw;
    this.ontoggle = ontoggle;
    this.onclick = onclick;
    this.getHeight = getHeight;
    this.getBounds = getBounds;
    this.setHeightChangeCallback = setHeightChangeCallback;
    this.isToggled = function(){return selected;};
    this.getLogic = function(){return logic;};
    this.getLabel = function(){return label;};
    this.setLabel = function(text){label = text; ctx.onmodify();};
    this.getBody = function(){return body;};
    this.getRep = getRep;
    this.type = 'while';

    if (typeof rep != 'undefined') {
        rep.body.hccb = rep.hccb; // copy resize notify callback
        body = new FlowBlockVisual(ctx,"loop-body",block,rep.body);
        logic = new FlowWhileLogic(this,block,rep.logic);
    }
    else {
        body = new FlowBlockVisual(ctx,"loop-body",block);
        logic = new FlowWhileLogic(this,block);
    }
}
