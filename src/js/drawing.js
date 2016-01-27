// drawing.js - progflow

/* Note about drawing:
    When we draw, we draw in the coordinate system bounded by x:[-1,1] and
    y:[-1,1].
*/

const SELECT_COLOR = "#0000ff"; // color of selection background
const SELECT_ALPHA = 0.15; // percent of alpha component for selected drawables
const VISUAL_PADDING = 0.05; // how much padding in coordinates
const ELEMENT_DIMENSION = 0.2; // scale factor for sub-elements
const ONE_THIRD = 0.3333333333333333333333333;
const ARROW_HEAD_ANGLE = 0.37887902; // angle of arrow head barbs from shaft
const ARROW_HEAD_LENGTH = 0.025; // length of arrow head
const ARROW_SHAFT_WIDTH = 0.001; // width of arrow shaft

// DrawingContext - handles top-level drawing operations; any object that
// implements the drawable interface
function DrawingContext(canvas,canvasView) {
    var ctx = canvas.getContext("2d"); // HTML5 Canvas context
    var drawables = []; // list of objects to be rendered
    var expand = 0; // number of elements by which we have expanded the canvas

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    // resizeCanvas() - this sizes the canvas so that it fits into the space provided
    // for it (i.e. the canvas view)
    function resizeCanvas() {
        // use the canvas view's dimensions as a starting point; factor out any
        // initial scroll height from the view
        canvas.width = canvasView.clientWidth;
        canvas.height = canvasView.clientHeight;
        canvas.height -= canvasView.scrollHeight - canvas.clientHeight;

        // expand the height of the canvas if we have specified some expand height
        var amt = expand * ELEMENT_DIMENSION;
        if (amt > 2) {
            canvas.height += canvas.height * amt;
        }

        // compute padding amounts according to the aspect ratio of the canvas
        // and assign the results to the canvas context for later lookup
        var px, py;
        px = py = VISUAL_PADDING;
        ctx.aspectRatio = canvas.height / canvas.width;
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

        // set up a coordinate system such that the ranges x:[-1,1] and y:[-1,1]
        // map to the entire surface of the canvas
        var hw = canvas.width / 2, hh = canvas.height / 2;
        ctx.setTransform(1,0,0,1,0,0);
        ctx.translate(hw,hh);
        ctx.scale(hw*(1-ctx.paddingX),hh*(1-ctx.paddingY));

        // render all of the drawable objects in our possession
        for (obj of drawables) {
            obj.draw(ctx);
        }
    }

    // registerDrawable() - add a drawable object to the context
    function registerDrawable(obj) {
        drawables.push(obj);
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
    function drawArrow(start,end,fill=true) {
        var v = {}, m, d, a, b;
        var head = [], headLength;
        var hw = canvas.width / 2;
        var hh = canvas.height / 2;

        function makeVector(dir,len=1) {
            var vector = {};
            vector.x = Math.cos(dir) * len;
            vector.y = Math.sin(dir) * len;
            return vector;
        }

        // change coordinate systems to avoid distortion; use one that preserves
        // the aspect ratio by making each unit as close as possible to a pixel
        // so that the fractional parts of each unit don't distort the image
        ctx.save();
        headLength = ARROW_HEAD_LENGTH * hw;
        ctx.scale(1/hw,1/hh);
        start[0] *= hw; end[0] *= hw;
        start[1] *= hh; end[1] *= hh;

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
        ctx.lineWidth = 1.0;
        if (fill)
            ctx.fill();
        ctx.stroke();
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

    ////////////////////////////////////////////////////////////////////////////
    // Public interface functions
    ////////////////////////////////////////////////////////////////////////////

    this.resizeCanvas = resizeCanvas;
    this.drawScreen = drawScreen;
    this.registerDrawable = registerDrawable;
    ctx.drawPolygon = drawPolygon;
    ctx.drawArrow = drawArrow;

    ////////////////////////////////////////////////////////////////////////////
    // Initialization
    ////////////////////////////////////////////////////////////////////////////

    // create top level block and resize canvas
    registerDrawable(new FlowBlockVisual("top-level")); // block to hold procedures
    resizeCanvas();
}

// FlowBlockVisual - represents the visual component of a block of program flow
// diagram elements rendered on the screen
function FlowBlockVisual(label) {
    var children = []; // list of child drawables
    var selected = false;

    ////////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////////

    function draw(ctx) {
        // draw the box representing the block
        ctx.save();
        ctx.drawPolygon([-1,-1,1,-1,1,1,-1,1]);
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

        // render our children inside our rectangle
        ctx.translate(0,-1+ELEMENT_DIMENSION); // dim-padding+padding => 1/3
        ctx.scale(ELEMENT_DIMENSION-ctx.paddingX,ELEMENT_DIMENSION-ctx.paddingY);

    }

    function toggle() {
        selected = !selected;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Public interface functions
    ////////////////////////////////////////////////////////////////////////////

    this.draw = draw;
    this.toggle = toggle;
}
