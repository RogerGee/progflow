// drawing.js - progflow

function DrawingContext(canvas) {
    var ctx = canvas.getContext("2d"); // HTML5 Canvas context
    var cbacks = []; // list of callbacks for draw operation

    // drawScreen() - perform all the drawing on the canvas
    function drawScreen() {
        // fill background
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(0,0,canvas.width,canvas.height);

        for (cb of cbacks) {
            cb(ctx);
        }
    }

    // registerCallback() - add a drawing callback to the context
    function registerCallback(callback) {
        cbacks.push(callback);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Public interface functions
    ////////////////////////////////////////////////////////////////////////////

    this.drawScreen = drawScreen;
    this.registerCallback = registerCallback;
}
