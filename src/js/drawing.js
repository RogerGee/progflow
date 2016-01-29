// drawing.js - progflow

const SELECT_COLOR = "#0000ff"; // color of selection background
const SELECT_ALPHA = 0.15; // percent of alpha component for selected drawables
const VISUAL_PADDING = 0.05; // how much padding in coordinates
const ONE_THIRD = 0.3333333333333333333333333; // we use this a lot
const ARROW_HEAD_ANGLE = 0.37887902; // angle of arrow head barbs from shaft
const ARROW_HEAD_LENGTH = 0.025; // length of arrow head
const ARROW_SHAFT_WIDTH = 0.001; // width of arrow shaft
const DEFAULT_FONT = "monospace";

// DrawingContext - handles top-level drawing operations
function DrawingContext(canvas,canvasView) {
    var ctx = canvas.getContext("2d"); // HTML5 Canvas context
    // block for all program elements
    var topBlock = new FlowBlockVisual("program");

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    // resizeCanvas() - this sizes the canvas so that it fits into the space provided
    // for it (i.e. the canvas view)
    function resizeCanvas() {
        var depth = topBlock.getDepth();

        // use the canvas view's dimensions as a starting point; factor out any
        // initial scroll height from the view
        canvas.width = canvasView.clientWidth;
        canvas.height = canvasView.clientHeight/2 * depth;
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
        // fill background
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "#000000";

        // set up a coordinate system such that the ranges x:[-1,1] and y:[-1,x-1]
        // map to the entire surface of the canvas where x is the depth
        var depth = topBlock.getDepth();
        var hw = canvas.width / 2, hh = canvas.height / 2;
        ctx.setTransform(1,0,0,1,0,0);
        ctx.translate(hw,hh); // translate to center of canvas
        ctx.scale(canvas.width/(2+VISUAL_PADDING),canvas.height/(depth+VISUAL_PADDING));
        ctx.translate(0,-depth/2+1); // adjust y such that there is one unit up

        // render all of the drawable objects in our possession which fall under
        // the top-level block
        topBlock.draw(ctx);

        drawArrow([-1,-1],[1,1]);
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
        var sy = canvas.height / topBlock.getDepth();

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
        var sy = canvas.height / topBlock.getDepth();

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

    ////////////////////////////////////////////////////////////////////////////
    // Public interface
    ////////////////////////////////////////////////////////////////////////////

    this.resizeCanvas = resizeCanvas;
    this.drawScreen = drawScreen;
    ctx.drawPolygon = drawPolygon;
    ctx.drawArrow = drawArrow;
    ctx.drawText = drawText;

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    for (var i = 0;i < 20;++i)
        topBlock.addChild(new FlowOperationVisual("assign "+(i+1))); //test

    topBlock.setDepthChangeCallback(resizeCanvas);
    resizeCanvas();
}

/* Visuals -

    Visuals represent the set of rendered elements used to compose a program
    flow diagram. Each object takes a label that may be left empty. Each object
    implements the following methods:
        - draw: render the visual
        - getDepth: get number of units in visual's height
        - setDepthChangeCallback: set a callback to be called whenever the
            visual's depth changes
*/

// FlowBlockVisual - represents the visual component of a block of program flow
// diagram elements rendered on the screen
function FlowBlockVisual(label) {
    var children = []; // list of child drawables
    var selected = false; // selected flag
    var maxy = 1.0; // max y-coordinate for our coordinate system
    var adjustDepth = null; // callback for depth adjustment notification

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    function draw(ctx) {
        // draw the box representing the block
        ctx.save();
        ctx.drawPolygon([-1,-1,1,-1,1,maxy,-1,maxy]);
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        ctx.setLineDash([2,5]);
        if (selected) {
            context.fillStyle = SELECT_COLOR;
            context.globalAlpha = SELECT_ALPHA;
            context.fill();
            context.globalAlpha = 1.0;
        }
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.restore();
        if (label != "") {
            // draw label in upper-left corner; we must position the text at
            // least half the font height down from the top
            ctx.drawText(label,-0.99,-0.925,ONE_THIRD,0.15);
        }

        // render our children inside our rectangle
        var h = ONE_THIRD*2, hh = h/2;
        var ty = -1+hh;
        for (var obj of children) {
            ctx.save();

            // translate by the current offset from the top and scale by the
            // half-height of a child element
            ctx.translate(0,ty);
            ctx.scale(ONE_THIRD,hh);

            obj.draw(ctx);
            ctx.restore();

            // advance to next vertical position; we obtain this from the child
            // which may have a nested structure; we multiply by 1/3 since
            // the child has been scaled by that factor
            ty += obj.getDepth() * ONE_THIRD;
        }

        ctx.restore();
    }

    // getDepth() - we need to be able to export our depth to somebody else;
    // the depth value is how many y-units we have (which is always one more than
    // the maximum positive y value available)
    function getDepth() {
        return maxy + 1;
    }

    // setDepthChangeCallback() - sets the depth change callback that is called
    // whenever the visual's depth changes
    function setDepthChangeCallback(callback) {
        adjustDepth = callback;
    }

    // toggle() - toggle selection status of element
    function toggle() {
        selected = !selected;
    }

    // addChild() - add a child element to the block; adjust our size if needed
    function addChild(child) {
        children.push(child);

        // each child element will take up 2/3 units
        var y = -1;
        for (var obj of children) {
            // each child lives in its own coordinate system that was scaled by
            // one-third
            y += obj.getDepth() * ONE_THIRD;
        }

        if (y > maxy) {
            maxy = y;
            if (adjustDepth != null) {
                adjustDepth();
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // Public interface
    ////////////////////////////////////////////////////////////////////////////

    this.draw = draw;
    this.getDepth = getDepth;
    this.setDepthChangeCallback = setDepthChangeCallback;
    this.toggle = toggle;
    this.addChild = addChild;
}

// FlowOperationVisual - represents a visual element representing a procedural
// operation in the program
function FlowOperationVisual(label) {
    var selected = false;

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    // draw() - main drawing operation
    function draw(ctx) {
        ctx.drawPolygon([-0.55,-0.5,0.55,-0.5,0.55,0.5,-0.55,0.5]);
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        if (selected) {
            context.fillStyle = SELECT_COLOR;
            context.globalAlpha = SELECT_ALPHA;
            context.fill();
            context.globalAlpha = 1.0;
        }
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.restore();
        if (label != "") {
            // draw label in center: maxWidth should be the width of the polygon
            // drawn above; fontHeight should be half the height of the polygon
            ctx.drawText(label,0,0,1.1,0.5,true);
        }
    }

    // toggle() - toggle select status of object
    function toggle() {
        selected = !selected;
    }

    // getDepth() - every proc. element will use 2 units (-1 to 1)
    function getDepth() {
        return 2;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Public interface
    ////////////////////////////////////////////////////////////////////////////

    this.draw = draw;
    this.toggle = toggle;
    this.getDepth = getDepth;
}
