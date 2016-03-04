// drawing.js - progflow

const SELECT_COLOR = "#0000ff"; // color of selection background
const SELECT_ALPHA = 0.10; // percent of alpha component for selected drawables
const VISUAL_PADDING = 0.05; // how much padding in coordinates
const ONE_THIRD = 0.3333333333333333333333333; // we use this a lot
const ARROW_HEAD_ANGLE = 0.37887902; // angle of arrow head barbs from shaft
const ARROW_HEAD_LENGTH = 0.025; // length of arrow head
const ARROW_SHAFT_WIDTH = 0.001; // width of arrow shaft
const DEFAULT_FONT = "monospace";

// DrawingContext - handles top-level drawing operations
function DrawingContext(canvas,canvasView,programName) {
    var ctx = canvas.getContext("2d"); // HTML5 Canvas context
    // block for all program elements
    var topBlock = new FlowBlockVisual(programName);
    var currentBlock = topBlock;
    var blockStack = [];

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
        currentBlock.draw(ctx);
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

        var sx = canvas.width / 2;
        var sy = canvas.height / currentBlock.getHeight();

        if (center) {
            ctx.textAlign = "center";
        }
        else {
            ctx.textAlign = "start";
        }
        ctx.textBaseline = "middle"; // thank God for this

        ctx.save();
        ctx.scale(1/sx,1/sy);
        x *= sx; y *= sy;
        maxWidth *= sx;

        var fontSz = fontHeight * sy;
        ctx.font = fontSz + "px " + DEFAULT_FONT;
        ctx.fillText(txt,x,y,maxWidth);

        ctx.restore();
    }

    // addBlock() - create new procedure block under top-block; this is used to
    // add top-level procedure visuals to the context
    function addBlock(label) {
        var element = new FlowBlockVisual(label); // has no parent logic to inherit
        element.setHeightChangeCallback(resizeCanvas);
        topBlock.addChild(element);
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
        }
    }

    // addNode() - creates and adds a child visual to the current block; the
    // current block must not be the top block
    function addNode(kind,label,param) {
        var node = null;

        // must not be in top block scope
        if (currentBlock === topBlock)
            return;

        // create node based on kind; it gets a reference to the current block's
        // logic object;
        kind = kind.toLowerCase();
        if (kind == "flowblock") {
            node = new FlowBlockVisual(label,currentBlock,param);
        }
        else if (kind == "flowoperation") {
            node = new FlowOperationVisual(label,currentBlock,param);
        }

        if (node != null) {
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

    ////////////////////////////////////////////////////////////////////////////
    // Public interface
    ////////////////////////////////////////////////////////////////////////////

    this.resizeCanvas = resizeCanvas;
    this.drawScreen = drawScreen;
    this.addBlock = addBlock;
    this.saveBlock = saveBlock;
    this.restoreBlock = restoreBlock;
    this.addNode = addNode;
    ctx.drawPolygon = drawPolygon;
    ctx.drawArrow = drawArrow;
    ctx.drawText = drawText;
    canvas.onclick = onCanvasClick;

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    topBlock.setHeightChangeCallback(resizeCanvas);
    topBlock.setIcon(false);
    addBlock("main");
    resizeCanvas();
}

/* Visuals -

    Visuals represent the set of rendered elements used to compose a program
    flow diagram. Each object takes a label that may be left empty and a
    reference to a flow-block object that may be null. Each object implements the
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
*/

// FlowBlockVisual - represents the visual component of a block of program flow
// diagram elements rendered on the screen
function FlowBlockVisual(label,block) {
    var children = []; // list of child drawables
    var iconified = true; // whether or not is iconified (i.e. made small)
    var maxy = 1.0; // max y-coordinate for our coordinate system
    var adjustHeight = null; // callback for height adjustment notification
    var logic; // logic state of visual

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    function draw(ctx) {
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
            ctx.save();

            // translate to the center of the object (using its half-height);
            // then scale by a factor that produces the visual padding; then
            // translate by the current offset from the top and scale by 1/3
            // (that will be the default height for a child element)
            ctx.translate(0,ty);
            ctx.translate(0,hh-ONE_THIRD);
            ctx.scale(1-VISUAL_PADDING/hh,1-VISUAL_PADDING/hh);
            ctx.translate(0,-hh+ONE_THIRD);
            ctx.scale(ONE_THIRD,ONE_THIRD);

            // draw the sub-visual
            obj.draw(ctx);
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

    // connect() - draw an arrow between two different visual elements
    function connect(ctx,a,b,off1,off2) {
        var hy = b.getBounds("arrowUpper");
        var ty = a.getBounds("arrowLower");

        // a visual may not define arrow bounds (meaning an arrow shouldn't be drawn)
        if (hy != null && ty != null) {
            // perform the same transformations that draw() does but with a different
            // translation for the head and tail
            hy *= ONE_THIRD; hy += off2;
            ty *= ONE_THIRD; ty += off1;

            ctx.drawArrow([0,ty],[0,hy]);
        }
    }

    // onclick() - return the child element that was clicked; x and y are coordinates
    // in the space we receive from our parent; if no direct child element was
    // found and the coordinates lie within our bounds, then return 'this'
    function onclick(x,y) {
        // only select child elements if we are not iconified
        if (!iconified) {
            // translate coordinates relative to the coordinates space for each child
            var cx, cy;
            var ty = -1+ONE_THIRD;
            cx = x / ONE_THIRD; cy = (y-ty) / ONE_THIRD;

            for (var obj of children) {
                // call 'onclick()' on the child element so it can bounds check itself
                // and any children it might have
                var result = obj.onclick(cx,cy);
                if (result != null) {
                    return result;
                }

                var amt = obj.getHeight() * ONE_THIRD;
                ty += amt;
                cy -= amt / ONE_THIRD;
            }
        }

        if (x >= getBounds("left") && x <= getBounds("right")
            && y >= getBounds("upper") && y <= getBounds("lower"))
        {
            return this;
        }

        return null;
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
            // insert (after) at position
            children.splice(index+1,0,child);
            if (typeof child.ontoggle != "undefined") {
                // untoggle current child and select the new one
                children[index].ontoggle(); // must be toggleable
                child.ontoggle();
            }
        }

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

    ////////////////////////////////////////////////////////////////////////////
    // Public interface
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
    this.type = 'block';
    this.getLabel = function(){return label;};
    this.setLabel = function(text){label = text;};
    this.forEachChild = forEachChild;

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    logic = new FlowBlockLogic(this);
}

// FlowOperationVisual - represents a visual element representing a procedural
// operation in the program
function FlowOperationVisual(label,block) {
    var selected = false;
    var logic;

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    // draw() - main drawing operation
    function draw(ctx) {
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
            return -1;
        if (kind == "right")
            return 1;
        if (typeof kind == "undefined")
            return [-1,-0.5,1,-0.5,1,0.5,-1,0.5];
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

    ////////////////////////////////////////////////////////////////////////////
    // Public interface
    ////////////////////////////////////////////////////////////////////////////

    this.draw = draw;
    this.ontoggle = ontoggle;
    this.getHeight = getHeight;
    this.getBounds = getBounds;
    this.onclick = onclick;
    this.isToggled = function(){return selected;};
    this.getLogic = function(){return logic;};
    this.getLabel = function(){return label;};
    this.setLabel = function(text){label = text;};
    this.type = 'operation';

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    logic = new FlowOperationLogic(this);
}
