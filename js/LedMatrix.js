/**
 * Return a variable containing everything that is marked with this
 * @param {string} elemid id of the svg element
 * @param {object} options otional params like number of pixel, pixel size ecc.
 */
LedMatrix = function (elemid, options) {
    // ------------- Public Tools -------------
    // add an editable windows
    this.addWindow = function (type) {
        if (self.displayArea.select(".textEdit").empty() && self.displayArea.select(".editingWindow").empty()) {
            // deselect all windows
            d3.selectAll(".selectedWindow").classed('selectedWindow', false);

            // remove the listener for deselection
            disableDeselectAll();

            // stop preview mode
            stopAnimation();

            var stop = false;

            // create a new brush inside the displayArea
            var brush = d3.svg.brush()
                .x(d3.scale.identity().domain([0, self.size.width]))
                .y(d3.scale.identity().domain([0, self.size.height]))
                .on("brushend", brushed)
                .on("brushstart", function () {
                    stop = stopEdit();
                });

            self.displayArea.append("g")
                .attr("class", "editingWindow")
                .call(brush);

            self.displayArea.select("rect.extent")
                .classed(type, true);

            // function that snap to grid the drawn area
            function brushed() {
                // snap to grid math
                var extent = brush.extent();
                var p1 = self.options.totPixelSize;
                var p8 = self.options.totPixelSize * 8;
                extent[0][0] = p1 * Math.round(extent[0][0] / p1) + self.options.offsetSize;
                extent[0][1] = p8 * Math.round(extent[0][1] / p8) + self.options.offsetSize;
                extent[1][0] = Math.max(p1 * Math.round(extent[1][0] / p1), extent[0][0] + p1 - self.options.offsetSize);
                extent[1][1] = Math.max(p8 * Math.round(extent[1][1] / p8), extent[0][1] + p8 - self.options.offsetSize);

                // applay snap
                d3.select(this).transition()
                    .each("end", function () {
                        if (stop) {
                            self.stopEditWindow();
                        }
                    })
                    .call(brush.extent(extent));
            }

        } else if (!self.displayArea.select(".selectedWindow").empty()) {
            alert("deselect window before adding new one!");
        } else {
            alert("stop editing the previous window!");
        }
    };

    // start edit the window
    this.startEditWindow = function () {
        if (!self.displayArea.select(".selectedWindow").empty()) {
            // remove the listener for deselection
            disableDeselectAll();
            self.cursorOff();

            // stop preview mode
            stopAnimation();

            // save the selected window in a temporary variable
            var selected = self.displayArea.select(".selectedWindow");
            var parent = $(".selectedWindow").parent();
            var chars = parent.find("g.char");

            // remove the selected window from the displayArea
            self.removeSelectedWindow();

            // copy the position of the selected window
            var pos = {
                x: parseFloat(parent.attr("x")),
                y: parseFloat(parent.attr("y")),
                width: parseFloat(selected.attr("width")) + parseFloat(parent.attr("x")),
                height: parseFloat(selected.attr("height")) + parseFloat(parent.attr("y"))
            };

            var stop = false;

            // create a new brush inside the displayArea at the saved position
            var brush = d3.svg.brush()
                .x(d3.scale.identity().domain([0, self.size.width]))
                .y(d3.scale.identity().domain([0, self.size.height]))
                .extent([[pos.x, pos.y], [pos.width, pos.height]])
                .on("brushstart", function () {
                    stop = stopEdit();
                })
                .on("brush", brushing)
                .on("brushend", brushed);

            var gBrush = self.displayArea.append("g")
                .attr("class", "editingWindow")
                .call(brush);

            // copy the data contained in the old window
            var data = [selected.datum()];

            data[0].remove = false;
            // if is a paged message
            if (selected.classed("page")) {
                data[0].type = "page";
            }
            // if is a paged message
            else if (selected.classed("scroll")) {
                data[0].type = "scroll";
            }

            // append the data in the new editable window
            self.displayArea.select("rect.extent")
                .data(data)
                .enter()
                .append("rect");


            gBrush.insert("g", ".background")
                .attr("transform", "translate(" + parent.attr("x") + "," + parent.attr("y") + ")")
                .attr("class", "message");

            $(".message").append(chars);

            gBrush.select(".background")
                .style("cursor", "default")
                .on("mousedown.brush", function () {
                    d3.event.stopImmediatePropagation();
                })
                .on("touchstart.brush", function () {
                    d3.event.stopImmediatePropagation();
                });


            // function that snap to grid the drawn area
            function brushed() {
                // copy the data contained in the old window
                var data = [self.displayArea.select("rect.extent").datum()];

                // snap to grid math
                var extent = brush.extent();
                var p1 = self.options.totPixelSize;
                var p8 = self.options.totPixelSize * 8;
                extent[0][0] = p1 * Math.round(extent[0][0] / p1) + self.options.offsetSize;
                extent[0][1] = p8 * Math.round(extent[0][1] / p8) + self.options.offsetSize;
                extent[1][0] = Math.max(p1 * Math.round(extent[1][0] / p1), extent[0][0] + p1 - self.options.offsetSize);
                extent[1][1] = Math.max(p8 * Math.round(extent[1][1] / p8), extent[0][1] + p8 - self.options.offsetSize);

                // apply snap
                d3.select(this).transition()
                    .each("end", function () {
                        if (stop) {
                            self.stopEditWindow();
                        }
                    })
                    .call(brush.extent(extent));


                // append the data in the new window
                self.displayArea.select("rect.extent")
                    .data(data)
                    .enter()
                    .append("rect");

                var message = $(".message");

                message.attr("transform", function () {
                    return "translate(" + brush.extent()[0][0] + "," + brush.extent()[0][1] + ")";
                });

                message.find(".char").each(function () {
                    var c = $(this);
                    var cx = parseFloat(c.attr("dx"));
                    var cy = parseFloat(c.attr("dy"));
                    c.attr("transform", "translate(" + cx + "," + cy + ")");
                });
            }

            // function that snap to grid the drawn area
            function brushing() {
                var message = $(".message");

                message.attr("transform", function () {
                    return "translate(" + brush.extent()[0][0] + "," + brush.extent()[0][1] + ")";
                });

                message.find(".char").each(function () {
                    var c = $(this);
                    var cx = parseFloat(c.attr("dx"));
                    var cy = parseFloat(c.attr("dy"));
                    c.attr("transform", "translate(" + cx + "," + cy + ")");
                });
            }
        }
    };

    // stop edit the window
    this.stopEditWindow = function () {
        if (!self.displayArea.select(".editingWindow").empty()) {
            // save the drawn window in a temporary variable
            var temp = self.displayArea.select("rect.extent");

            // remove the drawn window from the displayArea
            self.displayArea.select(".editingWindow").remove();

            // init or copy the data
            var data = [{
                remove: false,
                type: null,
                pages: [{
                    remove: false,
                    message: [],
                    font: [],
                    blinking: [],
                    cursorMaxXPos: 0,
                    cursorCurrXPos: 0,
                    cursorMaxYPos: 0,
                    cursorCurrYPos: 0,
                    cursorIndex: 0,
                    color: "000"
                }],
                duration: 2,
                spent: 0,
                selectedPage: 0,
                scrollStep: 0,
                scrollSpeed: 0
            }];

            if (temp.datum() !== 0) {
                data[0] = temp.datum();
            } else if (temp.classed("page")) {
                data[0].type = "page";
            } else if (temp.classed("scroll")) {
                data[0].type = "scroll";
            }

            var g = self.displayArea.append("g")
                .attr("class", "windowGroup");

            var svg = g.append("svg")
                .attr("x", temp.attr("x"))
                .attr("y", temp.attr("y"))
                .attr("width", temp.attr("width"))
                .attr("height", temp.attr("height"))
                .attr("class", "windowSVG");

            // create a new window with data in the drawn position
            var w = svg.selectAll(".windowSVG")
                .data(data)
                .enter()
                .append("rect")
                .attr("class", "window")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", temp.attr("width"))
                .attr("height", temp.attr("height"))
                .on("click", manageClick)
                .classed('textEdit', true);

            // save the window reference in the model
            self.displayArea.window.push(w);

            // add the listener for deselection
            enableDeselectAll();

            if (data[0].type === "page") {
                w.classed(data[0].type, true);
            } else if (data[0].type === "scroll") {
                w.classed(data[0].type, true);
            }

            if (data[0].pages[data[0].selectedPage].message.length !== 0) {
                var edit = $(".textEdit");
                // if is a paged message
                if (data[0].type === "page") {
                    for (var i = 0; i < data[0].pages.length; i++) {
                        writePageText(data[0].pages[i], edit.parent());
                    }
                    writePageText(data[0].pages[data[0].selectedPage], edit.parent());
                }
                // if is a paged message
                else if (data[0].type === "scroll") {
                    data[0].preview = 0;
                    writeAllScrollText(data[0].pages[data[0].selectedPage], edit.parent());
                }
            }

            w.classed('textEdit', false)
                .classed('selectedWindow', false);

        }

        startAnimation();
    };

    // remove the selected window
    this.removeSelectedWindow = function () {
        if (!self.displayArea.select(".selectedWindow").empty()) {
            // mark the window as removable
            self.displayArea.select(".selectedWindow").datum().remove = true;

            // for each window marked as removable, remove it from displayArea and model array
            for (var i = 0; i < self.displayArea.window.length; i++) {
                if (self.displayArea.window[i].datum().remove === true) {
                    $(".selectedWindow").parent().parent().remove();
                    self.displayArea.window.splice(i, 1);
                }
            }

            removeButtonsBar();

        } else {
            alert("select a window!");
        }
    };

    // insert message in the selected window
    this.insertPageMessage = function () {
        self.stopEditWindow();
        disableDeselectAll();
        enableStopMessage();
        if (!self.displayArea.select(".selectedWindow").empty()) {
            // mark the selected window as textEdit
            var w = self.displayArea.select(".selectedWindow")
                .on("click", moveCursor)
                .classed('textEdit', true)
                .classed('page', true);

            w.datum().type = "page";

            // turn on the cursor
            self.cursorPageOn();

            // stop preview mode
            stopAnimation();

        } else {
            alert("select a window!");
        }
    };

    // insert message in the selected window
    this.insertScrollMessage = function () {
        self.stopEditWindow();
        disableDeselectAll();
        enableStopMessage();
        if (!self.displayArea.select(".selectedWindow").empty()) {
            // mark the selected window as textEdit
            var w = self.displayArea.select(".selectedWindow")
                .on("click", function () {
                    d3.event.preventDefault();
                    d3.event.stopPropagation();
                })
                .classed('textEdit', true)
                .classed('scroll', true);

            w.datum().type = "scroll";

            // turn on the cursor
            self.cursorScrollOn();

            // stop preview mode
            stopAnimation();

            var data = w.datum();
            data.preview = 0;
            writeScrollText(data.pages[data.selectedPage], $(".selectedWindow").parent());


        } else {
            alert("select a window!");
        }
    };

    // save the message in the textEdit window
    this.saveMessage = function () {
        disableStopMessage();
        enableDeselectAll();
        if (!self.displayArea.select(".textEdit").empty()) {
            // mark the textEdit window as selected
            var edit = self.displayArea.select(".textEdit");
            var data = edit.datum();
            data = data.pages[data.selectedPage];


            // if is a paged message
            if (edit.classed("scroll")) {
                writeAllScrollText(data, $(".textEdit").parent());
            } else if (edit.classed("page")) {
                data.selectedPage = 0;
            }

            edit.on("click", manageClick)
                .classed('textEdit', false)
                .classed('selectedWindow', false);

            // turn off the cursor
            self.cursorOff();

        } else {
            alert("no modified window!");
        }

        // Deleting all the hidden characters:
        $('.char-hidden').remove();

        startAnimation();
    };

    // select the font
    this.selectFont = function (id) {
        if (id === undefined) id = 'minecraftia';
        self.selectedFont = self.fontManager.getFont(id);

        // Changing the size of the newline if it is the prev char:
        var editable = d3.select(".textEdit");
        if (!editable.empty()) {
            var data = editable.datum();
            data = data.pages[data.selectedPage];
            if (data.cursorIndex > 0 && data.message[data.cursorIndex - 1] === '\n') {
                data.font[data.cursorIndex - 1] = self.selectedFont;
            }
        }

        // Refreshing the cursor:
        self.cursorOff();

        // if is a paged message
        if (!editable.empty() && editable.classed("page")) {
            self.cursorPageOn();
        }
        // if is a paged message
        else if (!editable.empty() && editable.classed("scroll")) {
            self.cursorScrollOn();
        }

    };

    this.selectBlink = function (id) {
        if (id === undefined) id = 'blink-fixed';

        self.selectedBlink = id;
    };

    // turn on the cursor in top left corner
    this.cursorPageOn = function () {
        if (!self.displayArea.select(".textEdit").empty()) {
            var editable = d3.select(".textEdit");
            var data = editable.datum();
            data = data.pages[data.selectedPage];
            var parent = $(".textEdit").parent();

            data.cursorCurrXPos = parseFloat(parent.attr("x"));
            data.cursorCurrYPos = parseFloat(parent.attr("y"));

            var rowIndex = 0;
            var maxH;
            var j;
            for (var i = 0; i < data.cursorIndex; i++) {
                if (data.message[i] !== '\n') {
                    // add char width at cursor x pos and calculate y pos
                    data.cursorCurrXPos += data.font[i].getWidth(data.message[i]) + self.options.totPixelSize;
                    if (data.cursorCurrXPos > parseFloat(parent.attr("x")) + parseFloat(parent.attr("width")) + self.options.totPixelSize / 2) {
                        data.cursorCurrXPos = parseFloat(parent.attr("x")) + data.font[i].getWidth(data.message[i]) + self.options.totPixelSize;
                        maxH = 0;
                        for (j = parseInt(rowIndex); j < i; j++) {
                            if (maxH < data.font[j].getHeight()) {
                                maxH = data.font[j].getHeight();
                            }
                        }
                        rowIndex = i;
                        data.cursorCurrYPos += maxH;
                    }
                } else {
                    data.cursorCurrXPos = parseFloat(parent.attr("x"));
                    maxH = 0;
                    for (j = parseInt(rowIndex); j < i; j++) {
                        if (maxH < data.font[j].getHeight()) {
                            maxH = data.font[j].getHeight();
                        }
                    }
                    rowIndex = i;
                    data.cursorCurrYPos += maxH;
                }
            }

            // create a cursor with the height of the selected font
            var fontH = self.selectedFont.getHeight();
            var h = data.cursorCurrYPos + fontH - self.options.offsetSize;

            if (h <= self.size.height) {
                if (h > parseFloat(parent.attr("height")) + parseFloat(parent.attr("y"))) {
                    editable.attr("height", h - parseFloat(parent.attr("y")));
                    parent.attr("height", h - parseFloat(parent.attr("y")));
                }

                $('.displayArea').append(self.Line(data.cursorCurrXPos - self.options.offsetSize / 2, data.cursorCurrYPos, data.cursorCurrXPos - self.options.offsetSize / 2, h, self.options.offsetSize * 2, "cursor"));

                if (self.cursorBlinkTimer === null) {
                    // init the cursor blinking timer
                    self.cursorBlinkTimer = setInterval(cursorBlink, 350);
                }
            } else {
                self.saveMessage();
                console.info("select another font, this is big!");
            }
        }
    };

    // turn on the cursor in top right corner
    this.cursorScrollOn = function () {
        if (!self.displayArea.select(".textEdit").empty()) {
            var editable = d3.select(".textEdit");
            var data = editable.datum();
            data = data.pages[data.selectedPage];
            var parent = $(".textEdit").parent();

            data.cursorCurrXPos = parseFloat(parent.attr("x")) + parseFloat(parent.attr("width"));
            data.cursorCurrYPos = parseFloat(parent.attr("y"));

            // create a cursor with the height of the selected font
            var fontH = self.selectedFont.getHeight();
            var h = data.cursorCurrYPos + fontH - self.options.offsetSize;

            if (h <= self.size.height) {
                if (h > parseFloat(parent.attr("height")) + parseFloat(parent.attr("y"))) {
                    editable.attr("height", h - parseFloat(parent.attr("y")));
                    parent.attr("height", h - parseFloat(parent.attr("y")));
                }

                $('.displayArea').append(self.Line(data.cursorCurrXPos - self.options.offsetSize, data.cursorCurrYPos, data.cursorCurrXPos - self.options.offsetSize, h, self.options.offsetSize * 2, "cursor"));

                if (self.cursorBlinkTimer === null) {
                    // init the cursor blinking timer
                    self.cursorBlinkTimer = setInterval(cursorBlink, 500);
                }
            } else {
                self.saveMessage();
                console.info("select another font, this is big!");
            }
        }
    };

    // turn off the cursor
    this.cursorOff = function () {
        // stop the cursor blinking timer
        clearInterval(self.cursorBlinkTimer);
        self.cursorBlinkTimer = null;

        // remove the cursor
        $(".cursor").remove();
        self.cursor = null;
    };

    // Chooses the actual font depending on the cursor position.
    this.chooseFont = function (data) {
        // Empty case:
        if (data.font.length <= 0) {
            return;
        }

        // When there is a prev char:
        if (data.cursorIndex === data.font.length ||
            (data.cursorIndex > 0 && data.message[data.cursorIndex - 1] !== '\n')) {
            self.selectedFont = data.font[data.cursorIndex - 1];
        }
        else {
            self.selectedFont = data.font[data.cursorIndex];
        }
    };

    // Refreshing the cursor state:
    this.refreshCursor = function (data) {
        // Select the font:
        self.chooseFont(data);

        // update cursor
        self.cursorOff();
        self.cursorPageOn();
    };

    this.refreshScrollText = function (data, loc) {
        self.chooseFont(data);

        // update cursor
        self.cursorOff();
        self.cursorScrollOn();

        writeScrollText(data, loc);
    };

    this.addPage = function () {
        var w = self.displayArea.select(".textEdit", ".page");
        if (!w.empty()) {

            var loc = $(".textEdit").parent();
            var data = w.datum();

            var page = {
                remove: false,
                message: [],
                font: [],
                blinking: [],
                cursorMaxXPos: 0,
                cursorCurrXPos: 0,
                cursorMaxYPos: 0,
                cursorCurrYPos: 0,
                cursorIndex: 0,
                color: "000"
            };

            data.selectedPage++;

            data.pages.splice(data.selectedPage, 0, page);

            // update cursor
            self.cursorOff();
            self.cursorPageOn();

            writePageText(data.pages[data.selectedPage], loc);
        }
    };

    this.removePage = function () {
        var w = self.displayArea.select(".textEdit", ".page");
        if (!w.empty()) {

            var loc = $(".textEdit").parent();
            var data = w.datum();

            if (data.pages.length > 1) {
                data.pages.splice(data.selectedPage, 1);
            }

            if (data.selectedPage > 0) {
                data.selectedPage--;
            }

            // update cursor
            self.cursorOff();
            self.cursorPageOn();

            writePageText(data.pages[data.selectedPage], loc);
        }
    };

    this.nextPage = function () {
        var w = self.displayArea.select(".textEdit", ".page");
        if (!w.empty()) {

            var loc = $(".textEdit").parent();
            var data = w.datum();

            if (data.selectedPage < data.pages.length - 1) {
                data.selectedPage++;
            }

            // update cursor
            self.cursorOff();
            self.cursorPageOn();

            writePageText(data.pages[data.selectedPage], loc);
        }
    };

    this.prevPage = function () {
        var w = self.displayArea.select(".textEdit", ".page");
        if (!w.empty()) {

            var loc = $(".textEdit").parent();
            var data = w.datum();

            if (data.selectedPage > 0) {
                data.selectedPage--;
            }

            // update cursor
            self.cursorOff();
            self.cursorPageOn();

            writePageText(data.pages[data.selectedPage], loc);
        }
    };

    this.speedUp = function () {
        var w = self.displayArea.select(".selectedWindow", ".scroll");
        if (!w.empty()) {
            var data = w.datum();

            if (data.scrollSpeed > 0) {
                data.scrollSpeed--;
            }
        }
    };

    this.speedDown = function () {
        var w = self.displayArea.select(".selectedWindow", ".scroll");
        if (!w.empty()) {
            var data = w.datum();

            if (data.scrollSpeed < 3) {
                data.scrollSpeed++;
            }
        }
    };

    this.pageDuration = function (seconds) {
        var w = self.displayArea.select(".selectedWindow", ".page");
        if (!w.empty()) {
            var data = w.datum();

            data.duration = parseInt(seconds);
        }

    };
    // ------------- Do Stuff -------------
    // constant
    var DOUBLE_CLICK_TIME = 250;

    // init some data
    var self = this;
    var refreshView = 10;
    this.matrix = document.getElementById(elemid);
    this.options = options || {};
    this.options.horPixel = options.horPixel || 40;
    this.options.verPixel = options.verPixel || 30;
    this.options.pixelSize = options.pixelSize || 10;
    this.options.percent = options.percent || 0.2;
    this.options.offsetSize = this.options.pixelSize * this.options.percent;
    this.options.totPixelSize = this.options.pixelSize + this.options.offsetSize;
    this.options.border = this.options.totPixelSize;

    this.size = {
        width: this.options.horPixel * this.options.pixelSize + (this.options.horPixel + 1) * this.options.offsetSize,
        height: this.options.verPixel * this.options.pixelSize + (this.options.verPixel + 1) * this.options.offsetSize
    };

    // create the display
    this.displayArea = d3.select(this.matrix).append("svg")
        .attr("width", this.size.width)
        .attr("height", this.size.height)
        .attr("x", this.options.border / 2)
        .attr("y", this.options.border / 2)
        .attr("class", "displayArea");
    $(".displayArea").css('border', 'solid #333333 ' + this.options.border + 'px');

    var gGrid = this.SVG("g")
        .attr("class", "background-grid");

    this.displayArea.grid = $(".displayArea").append(gGrid);

    var rect = d3.select(".background-grid").append("rect")
        .attr("width", this.size.width)
        .attr("height", this.size.height)
        .attr("class", "background-display");

    // init data for ledGrid
    for (var y = this.options.offsetSize / 2; y <= this.size.height; y += this.options.totPixelSize) {
        $(".background-grid").append(self.Line(0, y, this.size.width, y, this.options.offsetSize, "gridLine"));
    }
    for (var x = this.options.offsetSize / 2; x <= this.size.width; x += this.options.totPixelSize) {
        $(".background-grid").append(self.Line(x, 0, x, this.size.height, this.options.offsetSize, "gridLine"));
    }

    // init displayArea structure
    this.displayArea.window = [];

    // init cursor stuff
    this.cursor = null;
    this.cursorBlinkTimer = null;

    // init font
    this.fontManager = this.FontManager();
    this.selectFont();

    // init blink
    this.selectBlink();

    // init preview stuff
    this.previewTimer = null;

    // init click stuff
    this.lastClickTime = 0;

    // ------------- Private Tools -------------
    // mark the window as selectedWindow and unselect all the other
    function manageClick() {
        var now = new Date().getTime();
        var dClick = false;
        if (now - self.lastClickTime < DOUBLE_CLICK_TIME) {
            dClick = true;
        }

        if (self.displayArea.select(".textEdit").empty()) {

            d3.event.preventDefault();
            d3.event.stopPropagation();

            if (dClick) {
                deselectAllWindows();
                d3.select(this).classed('selectedWindow', true);
                if (d3.select(this).classed("page")) {
                    self.insertPageMessage();
                } else {
                    self.insertScrollMessage();
                }
            } else {
                if (d3.select(this).classed("selectedWindow")) {
                    d3.select(this).classed('selectedWindow', false);

                    removeButtonsBar();

                } else {
                    deselectAllWindows();
                    d3.select(this).classed('selectedWindow', true);
                    addButtonsBar();
                }
            }
        }

        self.lastClickTime = now;

    }

    // deselect all windows
    function deselectAllWindows() {
        d3.selectAll(".selectedWindow").classed('selectedWindow', false);

        removeButtonsBar();

        d3.event.preventDefault();
        d3.event.stopPropagation();
    }

    // enable listeners on displayArea to unselect all windows
    function enableDeselectAll() {
        self.displayArea
            .on("click", deselectAllWindows);
    }

    // disable listeners on displayArea to unselect all windows
    function disableDeselectAll() {
        self.displayArea
            .on("click", null);
    }

    // enable listeners on displayArea to stop editing
    function enableStopMessage() {
        self.displayArea
            .on("click", self.saveMessage);
    }

    // disable listeners on displayArea to stop editing
    function disableStopMessage() {
        self.displayArea
            .on("click", null);
    }

    // cursor blinking manager
    function cursorBlink() {
        self.cursor = self.displayArea.select(".cursor");
        if (self.cursor.attr("visibility") === "hidden") {
            self.cursor.attr("visibility", "visible");
        } else {
            self.cursor.attr("visibility", "hidden");
        }
    }

    function moveCursor() {
        d3.event.stopImmediatePropagation();
        var area = d3.select(this);
        var mouse = d3.mouse(this);
        var clickX = mouse[0] - parseFloat(area.attr("x"));
        var clickY = mouse[1] - parseFloat(area.attr("y"));
        var data = area.datum();
        data = data.pages[data.selectedPage];
        var parent = $(this).parent().find("g.char");
        var i;
        var j = 0;
        var rowIndex = null;
        var row = [];
        var prevY = 0;
        var nearest = null;

        row[j] = [];

        if (data.message.length !== 0) {
            for (i = data.message.length - 1; i >= 0; i--) {
                var p = $(parent[i]);
                var charY = parseFloat(p.attr("dy"));

                if (prevY !== charY) {
                    prevY = charY;
                    j++;
                    row[j] = [];
                }
                row[j].push(p);
            }

            for (i in row) {
                for (j in row[i]) {
                    if ((clickY <= parseFloat(row[i][j].attr("dy")) + parseFloat(row[i][j].attr("height"))) && clickY > parseFloat(row[i][j].attr("dy"))) {
                        rowIndex = i;
                        break;
                    }
                }
            }

            if (rowIndex !== null) {
                var xS = [];
                for (j in row[rowIndex]) {
                    xS.push(parseFloat(row[rowIndex][j].attr("dx")));
                }

                xS.push(parseFloat(row[rowIndex][j].attr("dx")) + parseFloat(row[rowIndex][j].attr("width")));

                var closest = xS.reduce(function (prev, curr) {
                    return (Math.abs(curr - clickX) < Math.abs(prev - clickX) ? curr : prev);
                });

                for (j in row[rowIndex]) {
                    if (parseFloat(row[rowIndex][j].attr("dx")) === closest) {
                        nearest = parseFloat(row[rowIndex][j].attr("index"));
                    }
                }

                if (nearest === null) {
                    data.cursorIndex = parseFloat(row[rowIndex][row[rowIndex].length - 1].attr("index")) + 1;
                } else {
                    data.cursorIndex = nearest;
                }
            } else {
                data.cursorIndex = parseFloat(row[row.length - 1][row[row.length - 1].length - 1].attr("index")) + 1;
            }

            // Refreshing the font:
            self.refreshCursor(data);
        }
    }

    function startAnimation() {
        if (self.previewTimer === null) {
            // start preview mode
            self.previewTimer = setInterval(playAnimation, refreshView);
        }
    }

    function stopAnimation() {
        clearInterval(self.previewTimer);
        self.previewTimer = null;
    }

    function playAnimation() {
        d3.selectAll(".windowSVG").each(function () {
            var data = d3.select(this).select(".window").datum();
            var parent = $(this);

            if (data.type === "scroll") {
                var firstPage = data.pages[data.selectedPage];
                var chars = parent.find("g.char");
                var minX = $(chars[0]).attr("dx");
                var char;
                var newX;
                var i;

                if (data.scrollStep === 0) {
                    if (minX < 0) {
                        for (i = firstPage.message.length - 1; i >= 0; i--) {
                            char = $(chars[i]);
                            newX = parseFloat(char.attr("dx")) + Math.abs(minX) + parseFloat(parent.find(".window").attr("width")) + self.options.offsetSize;
                            char.attr("transform", "translate(" + newX + "," + parseFloat(char.attr("dy")) + ")")
                                .attr("dx", newX);
                        }
                    } else {
                        for (i = firstPage.message.length - 1; i >= 0; i--) {
                            char = $(chars[i]);
                            newX = parseFloat(char.attr("dx")) + parseFloat(parent.find(".window").attr("width")) + self.options.offsetSize - Math.abs(minX);
                            char.attr("transform", "translate(" + newX + "," + parseFloat(char.attr("dy")) + ")")
                                .attr("dx", newX);
                        }
                    }
                } else if (data.scrollStep % Math.pow(2, data.scrollSpeed) === 0) {
                    for (i = firstPage.message.length - 1; i >= 0; i--) {
                        char = $(chars[i]);
                        newX = parseFloat(char.attr("dx")) - self.options.totPixelSize;
                        char.attr("transform", "translate(" + newX + "," + parseFloat(char.attr("dy")) + ")")
                            .attr("dx", newX);
                    }
                }

                if (parseFloat($(chars[chars.length - 1]).attr("dx")) + (parseFloat($(chars[chars.length - 1]).attr("width"))) < 0) {
                    data.scrollStep = 0;
                } else {
                    data.scrollStep++;
                }
            }
            else if (data.type === "page") {
                if (data.spent < data.duration) {
                    data.spent += refreshView / 1000;
                } else {
                    data.spent = 0;
                    if (data.selectedPage === data.pages.length - 1) {
                        data.selectedPage = 0;
                    } else {
                        data.selectedPage++;
                    }
                    writeAllPageText(data.pages[data.selectedPage], parent);
                }
            }
        });
    }

    // add buttons bar to the selected window
    function addButtonsBar() {
        // window rect
        var win = $(".selectedWindow");

        // window svg that contain rect and chars
        var svg = win.parent();

        // window group where will be the context menu
        var g = svg.parent();

        // window dimension
        var x = parseFloat(svg.attr("x"));
        var y = parseFloat(svg.attr("y"));
        var w = parseFloat(svg.attr("width"));
        var h = parseFloat(svg.attr("height"));

        // context menu group
        var b = self.SVG("g")
            .attr("class", "context-menu");
        g.append(b);

        // computed window border
        var borderPath = computeBorderPath(x, y, w, h, self.options.border);

        // append border
        b.append(
            self.SVG("path")
                .attr("d", borderPath)
                .attr("fill", "#666666")
                .attr("fill-opacity", 0.9)
                .attr("class", "bar")
                .on("click", function (e) {
                    e.stopImmediatePropagation();
                })
        );

        // hamburger icon
        var s = Snap(".context-menu");

        // load SVG image from resources
        Snap.load("img/menu.svg", function (f) {
            // the group of paths in the image
            var g = f.select("g");

            // hover animation function
            var hoverover = function () {
                g.animate({transform: 's1.2,0,0t' + -self.options.border * 20 / self.options.pixelSize + "," + -self.options.border * 20 / self.options.pixelSize}, 500, mina.elastic)
            };

            // out hover animation function
            var hoverout = function () {
                g.animate({transform: 's1,0,0'}, 500, mina.elastic)
            };

            // properties of loaded svg
            f.select("svg")
                .attr("x", x + w + self.options.border / 2)
                .attr("y", y)
                .attr("width", self.options.border * 3)
                .attr("height", self.options.border * 3)
                .click(manageMenu)
                .hover(hoverover, hoverout);

            // append the svg
            s.append(f);
        });

        // check type of needed menu
        var type = "page";
        if (d3.select(".selectedWindow").classed("scroll")) {
            type = "scroll";
        }

        // context menu group
        var menuGroup = self.SVG("g")
            .attr("class", "menu-group");

        // append menu group
        b.append(menuGroup);

        //create the menu
        var menu = computeMenu(x, y, w, h, self.options.border, type);

        // move the selected window over
        g.appendTo(".displayArea");
    }

    // show or hide context menu
    function manageMenu(e) {
        // stop click propagation
        e.stopImmediatePropagation();

        // select thing
        var menu = d3.select(".menu-group");
        var icon = d3.select("#menu-icon");

        // open and close menu with css transition
        if (menu.classed("close-menu")) {
            menu.classed("close-menu", false);
            menu.classed("open-menu", true);
            icon.attr("class", "open")
        } else if (menu.classed("open-menu")) {
            menu.classed("open-menu", false);
            menu.classed("close-menu", true);
            icon.attr("class", "close")
        }
    }

    // remove buttons bar to the selected window
    function removeButtonsBar() {
        $(".context-menu").remove();
    }

    // stop editing window on double click on the svg brush
    function stopEdit() {
        var now = new Date().getTime();
        var dClick = false;
        if (now - self.lastClickTime < DOUBLE_CLICK_TIME) {
            dClick = true;
        }

        self.lastClickTime = now;

        return dClick;
    }

    function computeBorderPath(x, y, w, h, r) {

        var contextWidth = r * 3;
        var contextHeight = r * 3;

        r /= 2;

        var pathIn = "M" + x + "," + y + "v" + h + "h" + w + "V" + y + "z";
        var pathOut =
            "M" + x + "," + (y - r) +
            "h" + (w + contextWidth + r) +
            "a" + r + "," + r + " 0 0 1" + r + "," + r +
            "v" + contextHeight +
            "a" + r + "," + r + " 0 0 1" + -r + "," + r +
            "h" + (r - contextWidth) +
            "a" + r + "," + r + " 0 0 0" + -r + "," + r +
            "v" + (h - contextHeight - r * 2) +
            "a" + r + "," + r + " 0 0 1" + -r + "," + r +
            "H" + x +
            "a" + r + "," + r + " 0 0 1" + -r + "," + -r +
            "V" + y +
            "a" + r + "," + r + " 0 0 1" + r + "," + -r +
            "z";

        return pathOut + pathIn;
    }

    function computeMenuPath(x, y, w, h, r) {

        return "M" + x + "," + (y - r) +
            "h" + w +
            "a" + r + "," + r + " 0 0 1" + r + "," + r +
            "v" + h +
            "a" + r + "," + r + " 0 0 1" + -r + "," + r +
            "H" + x +
            "a" + r + "," + r + " 0 0 1" + -r + "," + -r +
            "V" + y +
            "a" + r + "," + r + " 0 0 1" + r + "," + -r +
            "z";

    }

    function computeMenu(x, y, w, h, r, type) {
        // do math for position
        var contextWidth = r * 3;
        var contextHeight = r * 3;
        var stdMenuHight = r * 4
        var stdMenuWidth = stdMenuHight * 6;
        var xMenu = x + w + r;
        var yMenu = y + contextHeight + r;
        var wMenu = stdMenuWidth;
        var hMenu = 0;

        // create snap object to import svg image
        var s = Snap(".menu-group");
        // remove icon
        // load SVG image from resources
        Snap.load("img/remove.svg", function (f) {

            // the group of paths in the image
            var g = f.select("g");

            // hover animation function
            var hoverover = function () {
                g.animate({fill: '#bada55'}, 200)
            };

            // out hover animation function
            var hoverout = function () {
                g.animate({fill: 'white'}, 200)
            };

            g.attr('fill', 'white');

            // properties of loaded svg
            f.select("svg")
                .attr("x", xMenu)
                .attr("y", y + stdMenuHight)
                .attr("width", stdMenuWidth)
                .attr("height", stdMenuHight)
                .click(self.removeSelectedWindow)
                .hover(hoverover, hoverout);

            // append the svg
            s.append(f);
        });

        // add one
        hMenu += stdMenuHight;

        // move icon
        // load SVG image from resources
        Snap.load("img/move.svg", function (f) {
            // the group of paths in the image
            var g = f.select("g");

            // hover animation function
            var hoverover = function () {
                g.animate({fill: '#bada55'}, 200)
            };

            // out hover animation function
            var hoverout = function () {
                g.animate({fill: 'white'}, 200)
            };

            g.attr('fill', 'white');

            // properties of loaded svg
            f.select("svg")
                .attr("x", xMenu)
                .attr("y", y + stdMenuHight*2)
                .attr("width", stdMenuWidth)
                .attr("height", stdMenuHight)
                .click(self.startEditWindow)
                .hover(hoverover, hoverout);

            // append the svg
            s.append(f);
        });

        // add two
        hMenu += stdMenuHight*2;

        if (type === "page") {
            // prev icon
            // load SVG image from resources
            Snap.load("img/prev.svg", function (f) {
                // the group of paths in the image
                var g = f.select("g");

                // hover animation function
                var hoverover = function () {
                    g.animate({fill: '#bada55'}, 200)
                };

                // out hover animation function
                var hoverout = function () {
                    g.animate({fill: 'white'}, 200)
                };

                g.attr('fill', 'white');

                // properties of loaded svg
                f.select("svg")
                    .attr("x", xMenu)
                    .attr("y", y + stdMenuHight*5)
                    .attr("width", stdMenuWidth/3)
                    .attr("height", stdMenuHight*2)
                    .click(self.prevPage)
                    .hover(hoverover, hoverout);

                // append the svg
                s.append(f);
            });

            // next icon
            // load SVG image from resources
            Snap.load("img/next.svg", function (f) {
                // the group of paths in the image
                var g = f.select("g");

                // hover animation function
                var hoverover = function () {
                    g.animate({fill: '#bada55'}, 200)
                };

                // out hover animation function
                var hoverout = function () {
                    g.animate({fill: 'white'}, 200)
                };

                g.attr('fill', 'white');

                // properties of loaded svg
                f.select("svg")
                    .attr("x", xMenu + stdMenuWidth*2/3)
                    .attr("y", y + stdMenuHight*5)
                    .attr("width", stdMenuWidth/3)
                    .attr("height", stdMenuHight*2)
                    .click(self.nextPage)
                    .hover(hoverover, hoverout);

                // append the svg
                s.append(f);
            });

            // add icon
            // load SVG image from resources
            Snap.load("img/add.svg", function (f) {
                // the group of paths in the image
                var g = f.select("g");

                // hover animation function
                var hoverover = function () {
                    g.animate({fill: '#bada55'}, 200)
                };

                // out hover animation function
                var hoverout = function () {
                    g.animate({fill: 'white'}, 200)
                };

                g.attr('fill', 'white');

                // properties of loaded svg
                f.select("svg")
                    .attr("x", xMenu + stdMenuWidth/3)
                    .attr("y", y + stdMenuHight*4)
                    .attr("width", stdMenuWidth/3)
                    .attr("height", stdMenuHight*2)
                    .click(self.addPage)
                    .hover(hoverover, hoverout);

                // append the svg
                s.append(f);
            });

            // delete icon
            // load SVG image from resources
            Snap.load("img/delete.svg", function (f) {
                // the group of paths in the image
                var g = f.select("g");

                // hover animation function
                var hoverover = function () {
                    g.animate({fill: '#bada55'}, 200)
                };

                // out hover animation function
                var hoverout = function () {
                    g.animate({fill: 'white'}, 200)
                };

                g.attr('fill', 'white');

                // properties of loaded svg
                f.select("svg")
                    .attr("x", xMenu + stdMenuWidth/3)
                    .attr("y", y + stdMenuHight*6)
                    .attr("width", stdMenuWidth/3)
                    .attr("height", stdMenuHight*2)
                    .click(self.removePage)
                    .hover(hoverover, hoverout);

                // append the svg
                s.append(f);
            });

            // add four
            hMenu += stdMenuHight*6;
        }

        /*if (type === "scroll") {
         hMenu = 100;
         }

         if (y + hMenu + r * 3 > self.size.height) {
         yMenu = y - (hMenu) / 2 + contextHeight;
         xMenu = x + w + contextWidth + r * 2;
         }
         if (yMenu + hMenu + r * 3 > self.size.height) {
         yMenu = y - (hMenu - contextHeight);
         xMenu = x + w + contextWidth + r * 2;
         }*/
         r /= 2;

        // select menu group
        var menuGroup = $(".menu-group");

        // create menu path depending on the type
        var menuPath = computeMenuPath(xMenu, yMenu, wMenu, hMenu, r);
        var menu = self.SVG("path")
            .attr("d", menuPath)
            .attr("fill", "#666666")
            .attr("fill-opacity", 0.9)
            .attr("class", "menu")
            .on("click", function (e) {
                e.stopImmediatePropagation();
            });

        // mark the menu as close
        var c = menuGroup.attr("class") + " close-menu";
        menuGroup.attr("class", c);

        menuGroup.append(menu);

    }

    // ------------- Private Editor Tools -------------
    var mousetrap = new Mousetrap();

    // bind keys
    // numbers
    mousetrap.bind('0', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('1', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('2', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('3', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('4', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('5', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('6', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('7', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('8', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('9', function (e, n) {
        keyboardAscii(e, n);
    });

    // lowercase letters
    mousetrap.bind('a', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('b', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('c', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('d', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('e', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('f', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('g', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('h', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('i', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('j', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('k', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('l', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('m', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('n', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('o', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('p', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('q', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('r', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('s', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('t', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('u', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('v', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('w', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('x', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('y', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('z', function (e, n) {
        keyboardAscii(e, n);
    });

    // uppercase letters
    mousetrap.bind('A', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('B', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('C', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('D', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('E', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('F', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('G', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('H', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('I', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('J', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('K', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('L', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('M', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('N', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('O', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('P', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('Q', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('R', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('S', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('T', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('U', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('V', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('W', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('X', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('Y', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('Z', function (e, n) {
        keyboardAscii(e, n);
    });

    // symbols
    mousetrap.bind('\\', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('|', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('!', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('"', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('~', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('%', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('&', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('/', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('(', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind(')', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('=', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('\'', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('?', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('^', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('[', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind(']', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('{', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('}', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('*', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('+', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('#', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('@', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('<', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('>', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind(',', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind(';', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('.', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind(':', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('-', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('_', function (e, n) {
        keyboardAscii(e, n);
    });
    mousetrap.bind('space', function (e) {
        keyboardAscii(e, " ");
    });

    // bind arrows
    mousetrap.bind('left', function (e, n) {
        keyboardArrow(e, n);
    });
    mousetrap.bind('up', function (e, n) {
        keyboardArrow(e, n);
    });
    mousetrap.bind('right', function (e, n) {
        keyboardArrow(e, n);
    });
    mousetrap.bind('down', function (e, n) {
        keyboardArrow(e, n);
    });

    // bind control
    mousetrap.bind('backspace', function (e, n) {
        keyboardControl(e, n);
    });
    mousetrap.bind('tab', function (e, n) {
        keyboardControl(e, n);
    });
    mousetrap.bind('enter', function (e, n) {
        keyboardControl(e, n);
    });
    mousetrap.bind('esc', function (e, n) {
        keyboardControl(e, n);
    });
    mousetrap.bind('del', function (e, n) {
        keyboardControl(e, n);
    });
    mousetrap.bind('shift', function (e, n) {
        keyboardControl(e, n);
    });
    mousetrap.bind('ctrl', function (e, n) {
        keyboardControl(e, n);
    });
    mousetrap.bind('alt', function (e, n) {
        keyboardControl(e, n);
    });
    mousetrap.bind('meta', function (e, n) {
        keyboardControl(e, n);
    });

    // disabled control
    mousetrap.bind('shift+space', function (e, n) {
        e.preventDefault();
        console.log("disabled: " + n);
        keyboardAscii(e, " ");
    });


    // unused control
    /*
     mousetrap.bind('pageup', function (e, n) {keyboardControl(e, n);});
     mousetrap.bind('pagedown', function (e, n) {keyboardControl(e, n);});
     mousetrap.bind('ins', function (e, n) {keyboardControl(e, n);});
     mousetrap.bind('home', function (e, n) {keyboardControl(e, n);});
     mousetrap.bind('capslock', function (e, n) {keyboardControl(e, n);});
     mousetrap.bind('end', function (e, n) {keyboardControl(e, n);});
     mousetrap.bind('escape', function (e, n) {keyboardControl(e, n);});
     mousetrap.bind('return', function (e, n) {keyboardControl(e, n);});
     */


    // start text editing
    function keyboardAscii(e, n) {
        // stop the event propagation
        e.preventDefault();

        // get the text area
        var edit = d3.select(".textEdit");

        // check if is empty
        if (edit.empty()) {
            console.log("nothing to fill with: " + n);
        } else {
            var data = edit.datum();
            data = data.pages[data.selectedPage];
            var loc = $(".textEdit").parent();

            // insert new char at cursor pos
            data.message.splice(data.cursorIndex, 0, n);

            //insert new font char at cursor pos
            data.font.splice(data.cursorIndex, 0, self.selectedFont);

            //insert new blink type at cursor pos
            data.blinking.splice(data.cursorIndex, 0, self.selectedBlink);

            // inc cursor index
            data.cursorIndex++;

            // if is a paged message
            if (edit.classed("page")) {
                // Writing the text:
                writePageText(data, loc);

                // Refreshing the cursor:
                self.refreshCursor(data);
            }
            // if is a paged message
            else if (edit.classed("scroll")) {
                // Writing the text:
                writeScrollText(data, loc);
            }
        }
    }

    // control detection
    function keyboardControl(e, n) {
        // stop the event propagation
        e.preventDefault();

        // get the text area
        var edit = d3.select(".textEdit");

        // check if is empty
        if (edit.empty()) {
            return;
        }
        var data = edit.datum();
        data = data.pages[data.selectedPage];
        var loc = $(".textEdit").parent();
        var mustRefresh = false;

        switch (n) {
            case "backspace":
            {
                // if is not the first char
                if (data.cursorIndex > 0) {
                    // insert new char at cursor pos
                    data.message.splice(data.cursorIndex - 1, 1);

                    //insert new font char at cursor pos
                    data.font.splice(data.cursorIndex - 1, 1);

                    //insert new blink type at cursor pos
                    data.blinking.splice(data.cursorIndex - 1, 1);

                    // inc cursor index
                    data.cursorIndex--;

                    // Must refresh:
                    mustRefresh = true;
                }
                break;
            }
            case "del":
            {
                // if is not the last char
                if (data.cursorIndex < data.message.length) {
                    // insert new char at cursor pos
                    data.message.splice(data.cursorIndex, 1);

                    //insert new font char at cursor pos
                    data.font.splice(data.cursorIndex, 1);

                    //insert new blink type at cursor pos
                    data.blinking.splice(data.cursorIndex, 1);


                    // Must refresh:
                    mustRefresh = true;
                }
                break;
            }
            case "enter":
            {
                if (edit.classed("page")) {
                    // insert new char at cursor pos
                    data.message.splice(data.cursorIndex, 0, '\n');

                    //insert new font char at cursor pos
                    data.font.splice(data.cursorIndex, 0, self.selectedFont);

                    //insert new blink type at cursor pos
                    data.blinking.splice(data.cursorIndex, 0, self.selectedBlink);

                    // inc cursor index
                    data.cursorIndex++;

                    // Must refresh:
                    mustRefresh = true;
                }
                break;
            }
        }

        // if is a paged message
        if (edit.classed("page")) {
            // Only if needed:
            if (mustRefresh) {
                // Writing the text:
                writePageText(data, loc);

                // Refreshing the cursor:
                self.refreshCursor(data);
            }
        }
        // if is a scroll message
        else if (edit.classed("scroll")) {
            // Only if needed:
            if (mustRefresh) {
                // Writing the text:
                writeScrollText(data, loc);
            }
        }
    }

    // move arrow detection
    function keyboardArrow(e, n) {
        // stop the event propagation
        e.preventDefault();

        // get the paged text area
        var edit = d3.select(".textEdit");
        var parent = $(".textEdit").parent();

        // check if is empty
        if (edit.empty()) {
            return;
        }

        var data = edit.datum();
        data = data.pages[data.selectedPage];


        // if is a paged message
        if (edit.classed("page")) {
            //if is not empty start
            var chars = parent.find("g.char");
            var currentX = data.cursorCurrXPos - parseFloat(parent.attr("x"));
            var i;
            var j;
            var rowIndex;
            var row = [];
            var prevY;
            var isNewline;
            var newRow;
            var xS;
            var p;
            var charY;
            var closest;


            switch (n) {
                case "left":
                {
                    // if is not the first
                    if (data.cursorIndex > 0) {

                        // inc cursor index
                        data.cursorIndex--;
                    }
                    break;
                }
                case "right":
                {
                    // if is not the last
                    if (data.cursorIndex < data.message.length) {

                        // inc cursor index
                        data.cursorIndex++;
                    }
                    break;
                }
                case "down":
                {
                    j = 0;
                    rowIndex = null;
                    row = [];
                    prevY = 0;

                    row[j] = [];

                    // if the message is not empty
                    if (data.message.length !== 0) {

                        // insert all the rows in the array
                        for (i = data.message.length - 1; i >= 0; i--) {
                            p = $(chars[i]);
                            charY = parseFloat(p.attr("dy"));

                            if (prevY !== charY) {
                                prevY = charY;
                                j++;
                                row[j] = [];
                            }
                            row[j].push(p);
                        }

                        // search what is the involved row
                        for (i in row) {
                            if (data.cursorCurrYPos - parseFloat(parent.attr("y")) === parseFloat(row[i][0].attr("dy"))) {
                                rowIndex = i;
                            }
                        }

                        // if is not the last row
                        if (rowIndex < row.length - 1) {
                            newRow = parseInt(rowIndex) + 1;

                            // insert the last point of each letters in an array
                            xS = [];
                            for (j in row[newRow]) {
                                xS.push(parseFloat(row[newRow][j].attr("dx")) + parseFloat(row[newRow][j].attr("width")));
                            }

                            // find the closest point in the array with the cursor position
                            closest = xS.reduce(function (prev, curr) {
                                return (Math.abs(curr - currentX) < Math.abs(prev - currentX) ? curr : prev);
                            });

                            // select the index of the nearest element
                            for (j in row[newRow]) {
                                if (parseFloat(row[newRow][j].attr("dx")) + parseFloat(row[newRow][j].attr("width")) === closest) {
                                    data.cursorIndex = parseFloat(row[newRow][j].attr("index")) + 1;
                                }
                            }
                        } else {
                            // if is the last row put the cursor at the end of the message
                            data.cursorIndex = data.message.length;
                        }
                    }
                    break;
                }
                case "up":
                {
                    j = 0;
                    rowIndex = null;
                    row = [];
                    prevY = 0;

                    row[j] = [];

                    // if the message is not empty
                    if (data.message.length !== 0) {

                        // insert all the rows in the array
                        for (i = data.message.length - 1; i >= 0; i--) {
                            p = $(chars[i]);
                            charY = parseFloat(p.attr("dy"));

                            if (prevY !== charY) {
                                prevY = charY;
                                j++;
                                row[j] = [];
                            }
                            row[j].push(p);
                        }

                        // search what is the involved row
                        for (i in row) {
                            if (data.cursorCurrYPos - parseFloat(parent.attr("y")) === parseFloat(row[i][0].attr("dy"))) {
                                rowIndex = i;
                            }
                        }

                        // if is not the first row
                        if (rowIndex > 0) {
                            isNewline = data.message[data.cursorIndex - 1] === '\n';
                            newRow = parseInt(rowIndex) - 1;

                            // insert the last point of each letters in an array
                            xS = [];
                            for (j in row[newRow]) {
                                xS.push(parseFloat(row[newRow][j].attr("dx")) + parseFloat(row[newRow][j].attr("width")));
                            }

                            // find the closest point in the array with the cursor position
                            closest = xS.reduce(function (prev, curr) {
                                return (Math.abs(curr - currentX) < Math.abs(prev - currentX) ? curr : prev);
                            });

                            // select the index of the nearest element
                            for (j in row[newRow]) {
                                if (parseFloat(row[newRow][j].attr("dx")) + parseFloat(row[newRow][j].attr("width")) === closest) {
                                    data.cursorIndex = parseFloat(row[newRow][j].attr("index")) + 1;
                                    // special case: second line first column, append to first line first column
                                    if (isNewline && data.cursorIndex === 1) {
                                        data.cursorIndex = 0;
                                    }
                                }
                            }

                        } else {
                            // if is the first row put the cursor at the start of the message
                            data.cursorIndex = 0;
                        }
                    }
                    break;
                }
            }

            // Refreshing the cursor position and font selection:
            self.refreshCursor(data);
        }
        // if is a scrolling message
        else if (edit.classed("scroll")) {
            switch (n) {
                case "left":
                case "up":
                {
                    // if is not the first
                    if (data.cursorIndex > 0) {

                        // inc cursor index
                        data.cursorIndex--;
                    }
                    break;
                }
                case "right":
                case "down":
                {
                    // if is not the last
                    if (data.cursorIndex < data.message.length) {

                        // inc cursor index
                        data.cursorIndex++;
                    }
                    break;
                }
            }

            var loc = $(".textEdit").parent();
            self.refreshScrollText(data, loc);
        }
    }

    // ------------- SVG Tools -------------
    function writePageText(data, location) {
        var area = location.find(".textEdit");
        var parent = area.parent();
        var x = parseFloat(area.attr("x"));
        var y = parseFloat(area.attr("y"));
        var w = parseFloat(area.attr("width"));
        var h = parseFloat(area.attr("height"));
        var xPos = x;
        var yPos = y;
        var cancel = false;
        var rowIndex = 0;
        var maxH;

        // save the used glyphs  in the font manager for time saving
        matrix.fontManager.releaseGlyphs(
            $(".textEdit").parent().find("g.char"));

        // for all the massage length
        for (var i = 0; i < data.message.length; i++) {
            // if the char is not a \n
            if (data.message[i] !== '\n') {
                // if the occupation is outside the windows width
                if (xPos + data.font[i].getWidth(data.message[i]) + self.options.totPixelSize > x + w + self.options.totPixelSize / 2) {
                    // set x pos to the window start x
                    xPos = x;

                    // calculate the max height of the previous line chars
                    maxH = 0;
                    for (var j = parseInt(rowIndex); j < i; j++) {
                        if (maxH < data.font[j].getHeight()) {
                            maxH = data.font[j].getHeight();
                        }
                    }

                    // increment the row index
                    rowIndex = i;

                    // move down y pos of the calculated height
                    yPos += maxH;
                }

                // insert the glyph
                var g = data.font[i].getGlyph(data.message[i])
                    .attr('transform', 'translate(' + xPos + ',' + yPos + ')')
                    .attr("dx", xPos - x)
                    .attr("dy", yPos - y)
                    .attr("index", i)
                    .attr("blinking", data.blinking[i]);

                location.prepend(g);

                // increment x pos of te glyph width
                xPos += data.font[i].getWidth(data.message[i]) + self.options.totPixelSize;
            }
            // if the char is a \n
            else {
                // set x pos to the window start x
                xPos = x;

                // calculate the max height of the previous line chars
                maxH = 0;
                for (var j = parseInt(rowIndex); j < i; j++) {
                    if (maxH < data.font[j].getHeight()) {
                        maxH = data.font[j].getHeight();
                    }
                }

                // increment the row index
                rowIndex = i;

                // move down y pos of the calculated height
                yPos += maxH;

                // insert the fake glyph just to detect mouse click
                var g = self.SVG("g")
                    .attr('transform', 'translate(' + xPos + ',' + yPos + ')')
                    .attr('width', 1)
                    .attr('height', data.font[i].getHeight())
                    .attr("dx", xPos - x)
                    .attr("dy", yPos - y)
                    .attr("index", i)
                    .attr('class', "char");

                location.prepend(g);
            }
        }

        // calculate the max height of the previous line chars
        maxH = 0;
        for (var j = parseInt(rowIndex); j < data.message.length; j++) {
            if (maxH < data.font[j].getHeight()) {
                maxH = data.font[j].getHeight();
            }
        }
        yPos += maxH;

        // adapt window height
        if (yPos >= y + h) {
            // check window height
            if (!(yPos > self.size.height)) {
                // if is possible enlarge
                area.attr("height", yPos - y - self.options.offsetSize);
                parent.attr("height", yPos - y - self.options.offsetSize);
            } else {
                // if is not possible enlarge height flag to cancel the inserted char
                cancel = true;
            }
        }

        // recursive call of the function if is flagged
        if (cancel) {
            data.cursorIndex--;
            data.message.splice(data.cursorIndex, 1);
            data.font.splice(data.cursorIndex, 1);
            writePageText(data, location);
            console.info("add a new page?");
        }

        location.find("g.char").each(function () {
            var self = $(this);
            self.attr("class", self.attr("class") + " " + self.attr("blinking"));
        });
    }

    function writeAllPageText(data, location) {
        var w = parseFloat(location.attr("width"));
        var xPos = 0;
        var yPos = 0;
        var rowIndex = 0;
        var maxH;

        // save the used glyphs  in the font manager for time saving
        matrix.fontManager.releaseGlyphs(
            location.find("g.char"));

        // for all the massage length
        for (var i = 0; i < data.message.length; i++) {
            // if the char is not a \n
            if (data.message[i] !== '\n') {
                // if the occupation is outside the windows width
                if (xPos + data.font[i].getWidth(data.message[i]) + self.options.totPixelSize > w + self.options.totPixelSize / 2) {
                    // set x pos to the window start x
                    xPos = 0;

                    // calculate the max height of the previous line chars
                    maxH = 0;
                    for (var j = parseInt(rowIndex); j < i; j++) {
                        if (maxH < data.font[j].getHeight()) {
                            maxH = data.font[j].getHeight();
                        }
                    }

                    // increment the row index
                    rowIndex = i;

                    // move down y pos of the calculated height
                    yPos += maxH;
                }

                // insert the glyph
                var g = data.font[i].getGlyph(data.message[i])
                    .attr('transform', 'translate(' + xPos + ',' + yPos + ')')
                    .attr("dx", xPos)
                    .attr("dy", yPos)
                    .attr("index", i)
                    .attr("blinking", data.blinking[i]);


                location.prepend(g);

                // increment x pos of te glyph width
                xPos += data.font[i].getWidth(data.message[i]) + self.options.totPixelSize;
            }
            // if the char is a \n
            else {
                // set x pos to the window start x
                xPos = 0;

                // calculate the max height of the previous line chars
                maxH = 0;
                for (var j = parseInt(rowIndex); j < i; j++) {
                    if (maxH < data.font[j].getHeight()) {
                        maxH = data.font[j].getHeight();
                    }
                }

                // increment the row index
                rowIndex = i;

                // move down y pos of the calculated height
                yPos += maxH;

                // insert the fake glyph just to detect mouse click
                var g = self.SVG("g")
                    .attr('transform', 'translate(' + xPos + ',' + yPos + ')')
                    .attr('width', 1)
                    .attr('height', data.font[i].getHeight())
                    .attr("dx", xPos)
                    .attr("dy", yPos)
                    .attr("index", i)
                    .attr('class', "char");

                location.prepend(g);
            }
        }

        location.find("g.char").each(function () {
            var self = $(this);
            self.attr("class", self.attr("class") + " " + self.attr("blinking"));
        });
    }

    function writeScrollText(data, location) {
        var area = location.find(".textEdit");
        var x = parseFloat(area.attr("x"));
        var y = parseFloat(area.attr("y"));
        var w = parseFloat(area.attr("width"));
        var xPos = x + w;

        // save the used glyphs  in the font manager for time saving
        matrix.fontManager.releaseGlyphs(location.find("g.char"));

        // from the index to the start
        for (var i = data.cursorIndex - 1; i >= 0; i--) {
            // if the occupation is not outside the windows width
            if (xPos - data.font[i].getWidth(data.message[i]) - self.options.offsetSize + 100 > x) {
                // decrement x pos of glyph width
                xPos -= data.font[i].getWidth(data.message[i]) - self.options.offsetSize;

                // insert the glyph
                var g = data.font[i].getGlyph(data.message[i])
                    .attr('transform', 'translate(' + xPos + ',' + y + ')')
                    .attr("dx", xPos - x)
                    .attr("dy", 0)
                    .attr("index", i)
                    .attr("blinking", data.blinking[i]);


                location.prepend(g);

                // decrement x pos of te glyph width
                xPos -= self.options.totPixelSize + self.options.offsetSize;
            } else {
                i = 0;
            }
        }

        location.find("g.char").each(function () {
            var self = $(this);
            self.attr("class", self.attr("class") + " " + self.attr("blinking"));
        });
    }

    function writeAllScrollText(data, location) {
        var area = location.find(".textEdit");
        var x = parseFloat(area.attr("x"));
        var y = parseFloat(area.attr("y"));
        var w = parseFloat(area.attr("width"));
        var h = parseFloat(area.attr("height"));
        var xPos = x + w;

        // save the used glyphs  in the font manager for time saving
        matrix.fontManager.releaseGlyphs(location.find("g.char"));

        // from the index to the start
        for (var i = data.message.length - 1; i >= 0; i--) {
            // decrement x pos of glyph width
            xPos -= data.font[i].getWidth(data.message[i]) - self.options.offsetSize;

            // insert the glyph
            var g = data.font[i].getGlyph(data.message[i])
                .attr('transform', 'translate(' + xPos + ',' + y + ')')
                .attr("dx", xPos - x)
                .attr("dy", 0)
                .attr("index", i)
                .attr("blinking", data.blinking[i]);


            location.prepend(g);

            // calculate the max height of the previous line chars
            var maxH = 0;
            for (var j = 0; j < data.message.length; j++) {
                if (maxH < data.font[j].getHeight()) {
                    maxH = data.font[j].getHeight();
                }
            }

            // adapt window height
            if (maxH >= y + h) {
                // check window height
                if (!(maxH + y > self.size.height)) {
                    // if is possible enlarge
                    area.attr("height", maxH - y - self.options.offsetSize);
                    location.attr("height", maxH - y - self.options.offsetSize);
                } else {
                    // if is not possible enlarge height flag to cancel the inserted char
                    area.attr("y", y - maxH);
                    location.attr("height", y - maxH);
                }
            }


            // decrement x pos of te glyph width
            xPos -= self.options.totPixelSize + self.options.offsetSize;
        }

        location.find("g.char").each(function () {
            var self = $(this);
            self.attr("class", self.attr("class") + " " + self.attr("blinking"));
        });
    }

};

// ------------- Data type -------------
// An SVG element:
LedMatrix.prototype.SVG = function (tag) {
    return $(document.createElementNS('http://www.w3.org/2000/svg', tag));
};

// A single line:
LedMatrix.prototype.Line = function (x1, y1, x2, y2, strokeWidth, klass) {
    return this.SVG('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke-width', strokeWidth)
        .attr('class', klass);
};

// A single led:
LedMatrix.prototype.Led = function (x, y, size) {
    var self = this;
    return {
        getSize: function () {
            return size;
        },
        createSvg: function () {
            return self.SVG('circle')
                .attr('cx', x + size / 2)
                .attr('cy', y + size / 2)
                .attr('r', size / 2)
                .attr('class', "led");
        }
    };
};

// Definition of a glyph:
LedMatrix.prototype.Glyph = function (char) {
    var leds = [], pos = 1,
        width = parseFloat(char.width) * this.options.totPixelSize,
        height = parseFloat(char.height) * this.options.totPixelSize;
    var self = this;

    for (var y = 0; y < char.height; y++) {
        for (var x = 0; x < char.width; x++) {
            if (char.data[pos] === '1') {
                leds.push(this.Led(
                    x * this.options.totPixelSize,
                    y * this.options.totPixelSize,
                    this.options.pixelSize));
            }
            pos += 2;
        }
    }
    return {
        leds: leds,
        getWidth: function () {
            return width;
        },
        getHeight: function () {
            return height;
        },
        createSvg: function () {
            var res = self.SVG('g')
                .attr('fill', 'orange');
            for (var i in leds) {
                res.append(leds[i].createSvg());
            }
            res.attr('height', height)
                .attr('width', width);
            return res;
        }
    };
};

// A font that can be crated from the JSON representation:
LedMatrix.prototype.Font = function (name, data) {
    // Attributes:
    var self = this;
    var res = {
        name: name,
        chars: []
    };
    data = JSON.parse(data);
    for (var i in data.font.glyphs.glyph) {
        var glyph = data.font.glyphs.glyph[i];
        var char = String.fromCharCode(glyph['@chr']);
        glyph = glyph.map;
        res.chars[char] = {
            width: glyph['@width'],
            height: glyph['@height'],
            type: glyph['@type'],
            data: glyph['$'],
            svgs: []
        };
    }

    // Methods:
    res.getHeight = function () {
        var g = this.getGlyph('_');
        var res = parseFloat(g.attr('height'));
        this.releaseGlyph(g);
        return res;
    };
    res.getWidth = function (name) {
        var g = this.getGlyph(name);
        var res = parseFloat(g.attr('width'));
        this.releaseGlyph(g);
        return res;
    };
    res.getGlyph = function (name) {
        // Obtaining the glyph:
        var char = this.chars[name];
        if (char.glyph === undefined) {
            // Decoding the glyph:
            char.glyph = self.Glyph(char);
        }

        // Lookup of an already created SVG:
        var svg;
        if (char.svgs.length > 0) {
            // Retrieving it:
            svg = char.svgs.pop();
        }
        else {
            // Creating it:
            svg = char.glyph.createSvg();

            // Adding some attributes:
            svg.attr('char', name);
        }

        // Some changes:
        svg.attr('class', 'char')
            .attr('font', this.name);

        // Done:
        return svg;
    };
    res.releaseGlyph = function (g) {
        // Checking:
        if (g === undefined) {
            return;
        }

        // Some changes:
        g.attr('class', 'char-hidden');

        // Adding it to the right character:
        this.chars[g.attr('char')].svgs.push(g);
    };

    // Done:
    return res;
};

// The font manager:
LedMatrix.prototype.FontManager = function () {
    // The actually loaded fonts:
    var fonts = {
        orochiifon: this.Font('orochiifon', '{"font":{"glyphs":{"glyph":[{"@chr":"8217","map":{"@width":"6","@height":"32","@type":"BINARY","$":"000000010101000000010101000000010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"8221","map":{"@width":"9","@height":"32","@type":"BINARY","$":"010101000000010101010101000000010101010101000000010101010101000000010101010101000000010101010101000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"32","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"33","map":{"@width":"3","@height":"32","@type":"BINARY","$":"010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000010101010101010101000000000000000000000000000000000000"}},{"@chr":"35","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010100000001010100000000000101010000000101010000000000010101000000010101000001010101010101010101010101010101010101010101010101010101010101010101010101010101010100000001010100000001010100000000000101010000000101010000010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000010101000000010101000000000001010100000001010100000000000101010000000101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"163","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000001010101010100000000000000000101010101010000000000000000010101010101000000000001010100000000000101010000000101010000000000010101000000010101000000000001010100000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000001010101010101010100000000000101010101010101010000000000010101010101010101000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"36","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000001010101010101010100000000000101010101010101010000000000010101010101010101000001010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000000000101010000000101010000000000010101010101010101010101000000000001010101010101010100000000000101010101010101010000000000000000010101000001010100000000000001010100000101010000000000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101000000010101010101010101000000000001010101010101010100000000000101010101010101010000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"37","map":{"@width":"17","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010100000000000000000000000101010101010000000000000000000000010101010101000000000000000000000001010101010100000000000101010000000101010101010000000000010101000000010101010101000000010101010100000000000000000000000001010100000000000000000000000000000101010000000000000000000000010101000000000000000000000000000001010100000000000000000000000000000101010000000000000000000000010101000000000001010101010100000001010100000000000101010101010000000101010000000000010101010101010101000000000000000001010101010101010100000000000000000101010101010101010000000000000000010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"38","map":{"@width":"17","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010100000000000000000000000000000101010000000000000000000000000000010101000000000000000000000001010100000001010100000000000000000101010000000101010000000000000000010101000000010101000000000000000001010100000001010100000000000000000101010000000101010000000000000000010101000000010101000000000000000000000001010100000000000000000000000000000101010000000000000000000000010101010101010101000000000000000001010100000001010100000000000000000101010000000101010000000000010101000000000000010101000001010101010100000000000001010100000101010101010000000000000101010000010101010101000000000000010101010100000001010100000000000001010101010000000101010000000000000101010101000000000000010101010101010101000001010100000001010101010101010100000101010000000101010101010101010000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"40","map":{"@width":"9","@height":"32","@type":"BINARY","$":"000000000000010101000000000000010101000000000000010101000000010101000000000000010101000000000000010101000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000000000010101000000000000010101000000000000010101000000000000000000010101000000000000010101000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"41","map":{"@width":"9","@height":"32","@type":"BINARY","$":"010101000000000000010101000000000000010101000000000000000000010101000000000000010101000000000000010101000000000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000010101000000000000010101000000000000010101000000010101000000000000010101000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"42","map":{"@width":"9","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101000000010101010101000000010101010101000000010101000000010101000000000000010101000000010101010101010101010101000000010101010101000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"43","map":{"@width":"19","@height":"32","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101000000000000000000000000000000000101010000000000000000000000000000000001010100000000000000000000000000000000010101000000000000000000000000000000000101010000000000000000000000000000000001010100000000000000000000000000000000010101000000000000000000000000000000000101010000000000000000010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000001010100000000000000000000000000000000010101000000000000000000000000000000000101010000000000000000000000000000000001010100000000000000000000000000000000010101000000000000000000000000000000000101010000000000000000000000000000000001010100000000000000000000000000000000010101000000000000000000000000000000000101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"44","map":{"@width":"3","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101010101010101010101010101000000000000000000"}},{"@chr":"45","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"46","map":{"@width":"3","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101010101000000000000000000000000000000000000"}},{"@chr":"47","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000010101010101000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"48","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010101010100000000000101010101010101010000000000010101010101010101000001010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000001010101000001010101010100000101010100000101010101010000010101010000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101010101010101000000000001010101010101010100000000000101010101010101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"49","map":{"@width":"9","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101000000010101010101000000010101010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000"}},{"@chr":"50","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101000000000000010101010101000000000000010101010101000000010101000000000000010101010101000000000000010101010101000000000000010101000000000000000000010101000000000000000000010101000000010101010101010101000000010101010101000000000000010101010101000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"51","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101000000000000010101010101000000000000010101010101000000010101000000000000010101010101000000000000010101010101000000000000010101000000000000000000010101000000000000000000010101000000010101010101010101000000010101010101000000000000010101010101000000000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101000000010101010101000000000000010101010101000000000000010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"52","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"53","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000010101000000000000000000010101000000000000000000010101010101010101000000010101010101010101000000010101010101010101010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101010101010101010101000000010101010101010101000000010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"54","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101000000000000010101010101000000000000010101010101000000010101000000000000000000010101000000000000000000010101000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101010101010101000000010101010101010101000000010101010101010101000000010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101000000010101010101000000000000010101010101000000000000010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"55","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000010101010101000000000000010101000000000000000000010101000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"56","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101000000000000010101010101000000000000010101010101000000010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101010101010101010101000000010101010101000000000000010101010101000000010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101000000010101010101000000000000010101010101000000000000010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"57","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101000000000000010101010101000000000000010101010101000000010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000010101010101010101010101010101000000010101010101010101000000010101010101010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000010101000000000000000000010101000000000000000000010101000000010101010101000000000000010101010101000000000000010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"58","map":{"@width":"3","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101010101000000000000000000010101010101010101000000000000000000000000000000000000000000000000000000"}},{"@chr":"59","map":{"@width":"3","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101010101000000000000000000000000000000000000010101010101010101010101010101010101000000000000000000"}},{"@chr":"60","map":{"@width":"9","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101000000000000010101000000010101010101000000010101000000000000010101000000010101000000000000010101000000000000010101000000000000000000010101000000000000010101000000000000010101000000000000000000010101000000000000010101000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"61","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"62","map":{"@width":"9","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101000000000000010101000000000000010101010101000000000000010101000000000000010101000000000000000000010101000000000000010101000000000000010101000000010101000000000000010101000000000000010101000000010101000000000000010101000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"63","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000001010101010101010100000000000101010101010101010000000000010101010101010101000001010100000000000000000101010101010000000000000000010101010101000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000001010100000000000000000000000101010000000000000000010101010101000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"64","map":{"@width":"20","@height":"32","@type":"BINARY","$":"00000000000001010101010101010000000000000000000000000101010101010101000000000000000000000000010101010101010100000000000000000001010100000000000000000101010000000000000101010000000000000000010101000000000000010101000000000000000001010100000001010100000000000001010100000000000101010101010000000000000101010000000000010101010101000000000000010101000000000001010101010100000001010100000101010000000101010101010000000101010000010101000000010101010101000000010101000001010100000001010101010100000001010100000101010000000101010101010000000101010000010101000000010101010101000000010101010101010101010101010101010100000001010101010101010101010101010101010000000101010101010101010101010101010101000000000000000000000000000000000001010100000000000000000000000000000000000101010000000000000000000000000000000000000000010101000000000000000001010100000000000001010100000000000000000101010000000000000101010000000000000000010101000000000000000000010101010101010100000000000000000000000001010101010101010000000000000000000000000101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"65","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000001010101010101010000000000000101010101010101000000000000010101010101010100000001010100000000000101010000000101010000000000010101000000010101000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"66","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010101010101010101010100000101010101010101010101010000010101010101010101010101000001010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010101010101010101010100000101010101010101010101010000010101010101010101010101010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101010101010101010101000001010101010101010101010100000101010101010101010101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"67","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000001010101010101010100000000000101010101010101010000000000010101010101010101000001010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101010101010101000000000001010101010101010100000000000101010101010101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"68","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010101010101010100000000000101010101010101010000000000010101010101010101000000000001010100000000000001010100000101010000000000000101010000010101000000000000010101000001010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000010101000001010100000000000001010100000101010000000000000101010000010101010101010101000000000001010101010101010100000000000101010101010101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"69","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010101010101010101010101010101010101010101010101010101010101010101010101010101010101010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010101010101010101010100000101010101010101010101010000010101010101010101010101000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"70","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010101010101010101010101010101010101010101010101010101010101010101010101010101010101010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010101010101010101010100000101010101010101010101010000010101010101010101010101000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"71","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000001010101010101010100000000000101010101010101010000000000010101010101010101000001010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000010101010101010100000000000001010101010101010000000000000101010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101010101010101010100000001010101010101010101010000000101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"72","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"73","map":{"@width":"9","@height":"32","@type":"BINARY","$":"010101010101010101010101010101010101010101010101010101000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000000000010101000000010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"74","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101000000000001010100000001010100000000000101010000000101010000000000010101000000000000010101010101010100000000000001010101010101010000000000000101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"75","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000001010100000101010000000000000101010000010101010101010101010101000001010101010101010101010100000101010101010101010101010000010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"76","map":{"@width":"12","@height":"32","@type":"BINARY","$":"010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"77","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010101010100000001010101010101010101010000000101010101010101010101000000010101010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"78","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010101010100000000000101010101010101010000000000010101010101010101000000000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000000000010101010101010100000000000001010101010101010000000000000101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"79","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000001010101010101010100000000000101010101010101010000000000010101010101010101000001010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101010101010101000000000001010101010101010100000000000101010101010101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"80","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010101010101010101010100000101010101010101010101010000010101010101010101010101000001010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010101010101010101010100000101010101010101010101010000010101010101010101010101000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"81","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000001010101010101010100000000000101010101010101010000000000010101010101010101000001010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101000000010101010101010101000000000001010101010101010100000000000101010101010101010000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000"}},{"@chr":"82","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010101010101010101010100000101010101010101010101010000010101010101010101010101000001010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010101010101010101010100000101010101010101010101010000010101010101010101010101000001010100000000000001010100000101010000000000000101010000010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"83","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000001010101010101010100000000000101010101010101010000000000010101010101010101000001010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000000000001010101010101010100000000000101010101010101010000000000010101010101010101010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101010101010101010101000001010101010101010101010100000101010101010101010101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"84","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010101010101010101010101010101010101010101010101010101010101010101010101010101010100000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"85","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101010101010101000000000001010101010101010100000000000101010101010101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"86","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101000000010101000000000001010100000001010100000000000101010000000101010000000000010101000000010101000000000001010100000001010100000000000101010000000101010000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"87","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101000000010101000000010101000000000001010100000001010100000000000101010000000101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"88","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010100000001010100000001010100000000000101010000000101010000000000010101000000010101000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000001010100000001010100000000000101010000000101010000010101010101000000010101010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"89","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010100000001010100000001010100000000000101010000000101010000000000010101000000010101000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"90","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010101010101010101010101010101010101010101010101010101010101010101010101010101010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000001010100000000000000000000000101010000000000000000010101010101000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"91","map":{"@width":"6","@height":"32","@type":"BINARY","$":"010101010101010101010101010101010101010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"92","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"93","map":{"@width":"6","@height":"32","@type":"BINARY","$":"010101010101010101010101010101010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"94","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000001010100000000000000000000000101010000000000000000000000010101000000000000000001010100000001010100000000000101010000000101010000000000010101000000010101000001010100000000000000000101010101010000000000000000010101010101000000000000000001010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"95","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"97","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010101010100000000000101010101010101010000000000010101010101010101010101000000000000000000000001010100000000000000000000000101010000000000010101010101010101000000000001010101010101010100000000000101010101010101010000010101000000000000010101000001010100000000000001010100000101010000000000000101010000010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"98","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010101010101010101010100000101010101010101010101010000010101010101010101010101010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101010101010101010101000001010101010101010101010100000101010101010101010101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"99","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010101010101010000000101010101010101010101010101010101010101010101010101010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000000000010101010101010101010100000001010101010101010101010000000101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"100","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000001010101010101010101010000000101010101010101010101010101010101010101010101010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101010101010101010100000001010101010101010101010000000101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"101","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010101010100000000000101010101010101010000010101010101010101010101010101010100000000000000000101010101010000000000000000010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000001010100000000000000000000000101010000000000000000000000000000010101010101010101010100000001010101010101010101010000000101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"102","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000010101010101000000000000010101010101000000000000010101010101000000010101000000000000010101010101000000000000010101010101000000000000010101010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101010101010101000000010101010101010101000000010101010101010101000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"103","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010101010101010000000101010101010101010101010101010101010101010101010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101010101010101010100000001010101010101010101010000000101010101010101010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101010101010101010101010101000001010101010101010101010100000101010101010101010101010000"}},{"@chr":"104","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010101010101010101010100000101010101010101010101010000010101010101010101010101010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"105","map":{"@width":"3","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000010101010101010101000000000000010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000"}},{"@chr":"106","map":{"@width":"6","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101000000010101000000010101000000000000000000000000000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101010101010101010101010101010101010101"}},{"@chr":"107","map":{"@width":"14","@height":"32","@type":"BINARY","$":"01010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000001010100000101010000000000000101010000010101000000000000010101000001010100000000000001010100000101010000000000000101010000010101010101010101000000000001010101010101010100000000000101010101010101010000000000010101000000000000010101000001010100000000000001010100000101010000000000000101010000010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"108","map":{"@width":"6","@height":"32","@type":"BINARY","$":"010101010101010101010101010101010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000010101000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"109","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010101010101010100000101010101010101010101010000010101010101010101010101010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"110","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010101010101010100000101010101010101010101010000010101010101010101010101010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"111","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010101010100000000000101010101010101010000010101010101010101010101010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101010101010101000000000001010101010101010100000000000101010101010101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"112","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010101010101010100000101010101010101010101010000010101010101010101010101010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101010101010101010101000001010101010101010101010100000101010101010101010101010000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000"}},{"@chr":"113","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010101010101010000000101010101010101010101010101010101010101010101010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101010101010101010100000001010101010101010101010000000101010101010101010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101"}},{"@chr":"114","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101000000010101010101010101000000010101010101010101010101010101010101010101010101000000000000010101010101000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"115","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010101010101010000000101010101010101010101010101010101010101010101010101010100000000000000000000000101010000000000000000000000000000010101010101010101000000000001010101010101010100000000000101010101010101010000000000000000000000000001010100000000000000000000000101010000000000000000000000010101010101010101010101010101000001010101010101010101010100000101010101010101010101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"116","map":{"@width":"12","@height":"32","@type":"BINARY","$":"000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000010101010101010101010101010101010101010101010101010101010101010101010101000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"117","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101010101010101010100000001010101010101010101010000000101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"118","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101000000010101000000000001010100000001010100000000000101010000000101010000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"119","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101010101000000010101000001010101010100000001010100000101010101010000000101010000010101000000010101000000010101000000000001010100000001010100000000000101010000000101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"120","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010100000000000000000101010101010000000000000000010101010101010101000000010101010100000001010100000001010100000000000101010000000101010000000000000000010101000000000000000000000001010100000000000000000000000101010000000000000000010101000000010101000000000001010100000001010100000000000101010000000101010000010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"121","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101010101000000000000000001010101010100000000000000000101010101010000000000000000010101000000010101010101010101010100000001010101010101010101010000000101010101010101010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101010101010101010101010101000001010101010101010101010100000101010101010101010101010000"}},{"@chr":"122","map":{"@width":"14","@height":"32","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010101010101010101010101010101010101010101010101010101010101010101010101010100000000000000000000000101010000000000000000000000010101000000010101010101010101000000000001010101010101010100000000000101010101010101010000010101000000000000000000000001010100000000000000000000000101010000000000000000000000010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"124","map":{"@width":"3","@height":"32","@type":"BINARY","$":"010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101000000000000000000000000000000000000"}}]}}}'),
        rainyhearts: this.Font('rainyhearts', '{"font":{"glyphs":{"glyph":[{"@chr":"32","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"33","map":{"@width":"3","@height":"16","@type":"BINARY","$":"000000000000000000000100000100000100000100000100000100000000010001000100000000000000000000000000"}},{"@chr":"34","map":{"@width":"4","@height":"16","@type":"BINARY","$":"00000000000000000000000000010001000100010100010000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"35","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000000010000010000000100000100000101010101010100010000010000000100000100000101010101010100010000010000000100000100000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"36","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000000000000000000000000000000010000000101010100010000010001010000010000000101010100000000010001000000010001010000010001010000010001000101010100000000010000000000000000000000000000000000000000"}},{"@chr":"37","map":{"@width":"10","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000010100000000000000010000010000010000000100000100010000000000010100000100000000000000000100000000000000000001000001010000000001000001000001000000010000010000010000010000000001010000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"38","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000000010101000000010000000100000100000001000000010001000000000001000000000001000100010001000000010000010000010001000001010000000100000000000000000000000000000000000000000000000000000000"}},{"@chr":"39","map":{"@width":"2","@height":"16","@type":"BINARY","$":"0000000000000001000101000000000000000000000000000000000000000000"}},{"@chr":"40","map":{"@width":"3","@height":"16","@type":"BINARY","$":"000000000000000000000001000100010000010000010000010000010000010000010000000100000001000000000000"}},{"@chr":"41","map":{"@width":"3","@height":"16","@type":"BINARY","$":"000000000000000000010000000100000001000001000001000001000001000001000001000100010000000000000000"}},{"@chr":"42","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000010001000101010101000101010001010101010001000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"43","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000100000000010000010101010100000100000000010000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"44","map":{"@width":"2","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000010100000000000000"}},{"@chr":"45","map":{"@width":"4","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000101010100000000000000000000000000000000000000000000000000000000"}},{"@chr":"46","map":{"@width":"1","@height":"16","@type":"BINARY","$":"00000000000000000000000100000000"}},{"@chr":"47","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000001000000000100000001000000000100000001000000000100000001000000000100000001000000000000000000000000000000000000000000000000"}},{"@chr":"48","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000001010100010000000101000000010100000001010000000101000000010100000001010000000100010101000000000000000000000000000000000000000000"}},{"@chr":"49","map":{"@width":"3","@height":"16","@type":"BINARY","$":"000000000000000000000100010100000100000100000100000100000100000100010101000000000000000000000000"}},{"@chr":"50","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000001010100010000000100000000010000000001000000010000000100000001000000010000000001010101010000000000000000000000000000000000000000"}},{"@chr":"51","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000001010100010000000100000000010000010100000000000100000000010000000001010000000100010101000000000000000000000000000000000000000000"}},{"@chr":"52","map":{"@width":"4","@height":"16","@type":"BINARY","$":"00000000000000000000000000000001010000010100000101000001010000010101010100000001000000010000000100000000000000000000000000000000"}},{"@chr":"53","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000001010101010000000001000000000101010100000000000100000000010000000001010000000100010101000000000000000000000000000000000000000000"}},{"@chr":"54","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000001010100010000000101000000000101010100010000000101000000010100000001010000000100010101000000000000000000000000000000000000000000"}},{"@chr":"55","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000101010100000000000100000000010000000001000000010000000100000000010000000001000000000100000000000000000000000000000000000000000000"}},{"@chr":"56","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000001010100010000000101000000010100000001000101010001000000010100000001010000000100010101000000000000000000000000000000000000000000"}},{"@chr":"57","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000001010100010000000101000000010100000001000101010100000000010000000001010000000100010101000000000000000000000000000000000000000000"}},{"@chr":"58","map":{"@width":"1","@height":"16","@type":"BINARY","$":"00000000000001000000000100000000"}},{"@chr":"59","map":{"@width":"2","@height":"16","@type":"BINARY","$":"0000000000000000000000000001000000000000000000010001010000000000"}},{"@chr":"60","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000001010001010000010000000000010100000000000101000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"61","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000001010101010000000000000000000001010101010000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"62","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000001010000000000010100000000000100000101000101000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"63","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000001010100010000000101000000010000000100000001000000000100000000000000000100010000000100000000000000000000000000000000000000000000"}},{"@chr":"64","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000001010101010000000100000000000100010000010101000001010001000000010001010001000000010001010001000000010001010001000000010001010000010101000100000100000000000000000001010101010100000000000000000000000000000000000000000000000000000000"}},{"@chr":"65","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000001010000000100000100010000000001010000000001010101010101010000000001010000000001010000000001010000000001000000000000000000000000000000000000000000000000"}},{"@chr":"66","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000101010100010000000001010000000001010000000001010101010100010000000001010000000001010000000001000101010100000000000000000000000000000000000000000000000000"}},{"@chr":"67","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000000000101010100000100000000010100000000000001000000000000010000000000000100000000000001000000000000000100000000010000010101010000000000000000000000000000000000000000000000000000000000"}},{"@chr":"68","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000000010101010000010000000001000100000000000101000000000001010000000000010100000000000101000000000001010000000001000001010101000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"69","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000101010101010000000000010000000000010000000000010101010100010000000000010000000000010000000000000101010101000000000000000000000000000000000000000000000000"}},{"@chr":"70","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000101010101010000000000010000000000010000000000010101010100010000000000010000000000010000000000010000000000000000000000000000000000000000000000000000000000"}},{"@chr":"71","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000000010101010100010000000000010100000000000001000000000000010000010101000100000000000101000000000001010000000000010001010101010000000000000000000000000000000000000000000000000000000000"}},{"@chr":"72","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000001000000000001010000000000010100000000000101000101010101010000000000010100000000000101000000000001010000000000010100000000000100000000000000000000000000000000000000000000000000000000"}},{"@chr":"73","map":{"@width":"3","@height":"16","@type":"BINARY","$":"000000000000000000010101000100000100000100000100000100000100000100010101000000000000000000000000"}},{"@chr":"74","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000010101000000010000000001000000000100000000010000000001000100000100010000010000010100000000000000000000000000000000000000000000"}},{"@chr":"75","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000001000000000001010000000000010100000000010001000000010000010001010000000100000001000001000000000100010000000000010100000000000100000000000000000000000000000000000000000000000000000000"}},{"@chr":"76","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000100000000010000000001000000000100000000010000000001000000000100000000010000000000010101010000000000000000000000000000000000000000"}},{"@chr":"77","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000001010100010100010000000100000101000000010000010100000001000001010000000100000101000000000000010100000000000001010000000000000101000000000000010000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"78","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000000010000000001010001000000010100010000000101000001000001010000010000010100000100000101000000010001010000000100010100000000010000000000000000000000000000000000000000000000000000000000"}},{"@chr":"79","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000010101010000000100000000010001000000000000010100000000000001010000000000000101000000000000010100000000000001000100000000010000000101010100000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"80","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000101010100010000000001010000000001010000000001010101010100010000000000010000000000010000000000010000000000000000000000000000000000000000000000000000000000"}},{"@chr":"81","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000001010101000000000100000000010000010000000000000100010000000000000100010000000000000100010000000000000100010000000001000100000100000000010000000001010101000101000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"82","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000001010101010000010000000000010001000000000001000100000000000100010001010101000001000000000001000100000000000100010000000000010001000000000001010000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"83","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000000010101010100010000000000010100000000000000010101010100000000000000010000000000000101000000000001010000000000010001010101010000000000000000000000000000000000000000000000000000000000"}},{"@chr":"84","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000001010101010101000000010000000000000100000000000001000000000000010000000000000100000000000001000000000000010000000000000100000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"85","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000001000000000001010000000000010100000000000101000000000001010000000000010100000000000101000000000001000100000001000000010101000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"86","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000001000000000001010000000000010100000000000101000000000001010000000000010001000000010000010000000100000001000100000000000100000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"87","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000100000000000001010000000000000101000000000000010100000000000001010000000100000101000000010000010100000001000001010000000100000100010101000101000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"88","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000010000000001010000000001000100000100000001010000000100000100010000000001010000000001010000000001010000000001000000000000000000000000000000000000000000000000"}},{"@chr":"89","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000001000000000001010000000000010100000000000100010000000100000001000100000000000100000000000001000000000000010000000000000100000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"90","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000010101010100000000000001000000000100000000010000000001000000000100000000010000000000010000000000000101010101000000000000000000000000000000000000000000000000"}},{"@chr":"91","map":{"@width":"3","@height":"16","@type":"BINARY","$":"000000000000000000000101010000010000010000010000010000010000010000010000010000000101000000000000"}},{"@chr":"92","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000100000000010000000000010000000001000000000001000000000100000000000100000000010000000000010000000000000000000000000000000000000000"}},{"@chr":"93","map":{"@width":"3","@height":"16","@type":"BINARY","$":"000000000000000000010100000001000001000001000001000001000001000001000001000001010100000000000000"}},{"@chr":"94","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000010000000100010001000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"95","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101010000000000000000000000000000"}},{"@chr":"96","map":{"@width":"2","@height":"16","@type":"BINARY","$":"0000000000000100000100000000000000000000000000000000000000000000"}},{"@chr":"97","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000101010000010000000100010000000100010000000100010000000100000101010001000000000000000000000000000000000000000000000000"}},{"@chr":"98","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000100000000010000000001000000000101010100010000000101000000010100000001010000000100010101000000000000000000000000000000000000000000"}},{"@chr":"99","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000001010100010000000101000000000100000000010000000100010101000000000000000000000000000000000000000000"}},{"@chr":"100","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000001000000000100000000010001010101010000000101000000010100000001010000000100010101000000000000000000000000000000000000000000"}},{"@chr":"101","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000001010100010000000101010101000100000000010000000100010101000000000000000000000000000000000000000000"}},{"@chr":"102","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000010100000001000001000001000000000101010000000001000000000001000000000001000000000001000000000001000000010001000000000100000000000000000000"}},{"@chr":"103","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000001010100010000000101000000010100000001000101010100000000010000000001010000000100010101000000000000"}},{"@chr":"104","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000100000000010000000001000000000101010100010000000101000000010100000001010000000101000000010000000000000000000000000000000000000000"}},{"@chr":"105","map":{"@width":"3","@height":"16","@type":"BINARY","$":"000000000000000000010001000100000000000100000100000100000100000100000100000000000000000000000000"}},{"@chr":"106","map":{"@width":"4","@height":"16","@type":"BINARY","$":"00000000000000000000000000010001000001000000000000000100000001000000010000000100000001000000010000000100010001000001000000000000"}},{"@chr":"107","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000100000000010000000001000000000100000001010000010001010100000100000100010000000101000000010000000000000000000000000000000000000000"}},{"@chr":"108","map":{"@width":"3","@height":"16","@type":"BINARY","$":"000000000000000000010000010000010000010000010000010000010000010001000100000000000000000000000000"}},{"@chr":"109","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010100010100010000000100000101000000010000010100000001000001010000000100000101000000010000010000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"110","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000001010100010000000101000000010100000001010000000101000000010000000000000000000000000000000000000000"}},{"@chr":"111","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000001010100010000000101000000010100000001010000000100010101000000000000000000000000000000000000000000"}},{"@chr":"112","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000001010100010000000101000000010100000001010000000101010101000100000000010000000001000000000000000000"}},{"@chr":"113","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000001010100010000000101000000010100000001010000000100010101010000000001000000000100000000010000000000"}},{"@chr":"114","map":{"@width":"4","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000000000000000001000101010100000100000001000000010000000100000000000000000000000000000000000000"}},{"@chr":"115","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000001010100010000000000010101000000000001010000000100010101000000000000000000000000000000000000000000"}},{"@chr":"116","map":{"@width":"4","@height":"16","@type":"BINARY","$":"00000000000000000000000000000000000100000001000001010101000100000001000000010000000100000000010100000000000000000000000000000000"}},{"@chr":"117","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000100000001010000000101000000010100000001010000010100010100010000000000000000000000000000000000000000"}},{"@chr":"118","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000100000001010000000101000000010001000100000100010000000100000000000000000000000000000000000000000000"}},{"@chr":"119","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000001000001010000000100000101000000010000010100000001000001010000000100000100010101000101000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"120","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000100000001010000000100010101000100000001010000000101000000010000000000000000000000000000000000000000"}},{"@chr":"121","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000100000001010000000101000000010100000001000101010100000000010000000001010000000100010101000000000000"}},{"@chr":"122","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000101010100000000000100000001000000010000000100000001010101010000000000000000000000000000000000000000"}},{"@chr":"123","map":{"@width":"3","@height":"16","@type":"BINARY","$":"000000000000000000000001000100000100000100000100010000000100000100000100000100000001000000000000"}},{"@chr":"124","map":{"@width":"1","@height":"16","@type":"BINARY","$":"00000101010101010101010101010100"}},{"@chr":"125","map":{"@width":"3","@height":"16","@type":"BINARY","$":"000000000000000000010000000100000100000100000100000001000100000100000100000100010000000000000000"}},{"@chr":"126","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000101000001010000010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}}]}}}'),
        minecraftia: this.Font('minecraftia', '{"font":{"glyphs":{"glyph":[{"@chr":"34","map":{"@width":"3","@height":"8","@type":"BINARY","$":"010001010001000000000000000000000000000000000000"}},{"@chr":"35","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0001000100010001010101010001000101010101000100010001000100000000"}},{"@chr":"32","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"33","map":{"@width":"1","@height":"8","@type":"BINARY","$":"0101010101000100"}},{"@chr":"38","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000010000010001000001000001010101000101010000010001010100000000"}},{"@chr":"39","map":{"@width":"1","@height":"8","@type":"BINARY","$":"0101000000000000"}},{"@chr":"36","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000010000010101010000000001010100000001010101010000010000000000"}},{"@chr":"37","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000101000001000000010000010000010000000100010100000100000000"}},{"@chr":"163","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000010100010000000100000101010100010000000100000101010100000000"}},{"@chr":"42","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000100010100010000010000000000000000000000000000000000000000"}},{"@chr":"43","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000000001000000010001010101000001000000010000000000"}},{"@chr":"40","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000010100010000010000000100000001000000000100000000010100000000"}},{"@chr":"41","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0101000000000100000000010000000100000001000001000101000000000000"}},{"@chr":"46","map":{"@width":"1","@height":"8","@type":"BINARY","$":"0000000000010100"}},{"@chr":"47","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000100000001000000010000010000010000000100000100000000000000"}},{"@chr":"44","map":{"@width":"1","@height":"8","@type":"BINARY","$":"0000000000010101"}},{"@chr":"45","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000000000000000000001010101000000000000000000000000"}},{"@chr":"51","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0001010101000001000000010000010100000001010000010001010100000000"}},{"@chr":"50","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0001010101000001000000010000010100010000010000000101010100000000"}},{"@chr":"49","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000010000010100000001000000010000000100000001000101010100000000"}},{"@chr":"48","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0001010101000001010000010100010101010001010000010001010100000000"}},{"@chr":"55","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0101010101000001000000010000000100000100000001000000010000000000"}},{"@chr":"54","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000010100010000010000000101010101000001010000010001010100000000"}},{"@chr":"53","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0101010101000000010101010000000100000001010000010001010100000000"}},{"@chr":"52","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000100000101000100010100000101010101000000010000000100000000"}},{"@chr":"59","map":{"@width":"1","@height":"8","@type":"BINARY","$":"0001010000010101"}},{"@chr":"58","map":{"@width":"1","@height":"8","@type":"BINARY","$":"0001010000010100"}},{"@chr":"57","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0001010101000001010000010001010100000001000000010001010000000000"}},{"@chr":"56","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0001010101000001010000010001010101000001010000010001010100000000"}},{"@chr":"62","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000000010000000001000000000100000100000100000100000000000000"}},{"@chr":"61","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000010101010000000000000000010101010000000000000000"}},{"@chr":"60","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000100000100000100000100000000010000000001000000000100000000"}},{"@chr":"68","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0101010101000001010000010100000101000001010000010101010100000000"}},{"@chr":"69","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0101010101000000010101000100000001000000010000000101010100000000"}},{"@chr":"70","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0101010101000000010101000100000001000000010000000100000000000000"}},{"@chr":"71","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0001010101000000010001010100000101000001010000010001010100000000"}},{"@chr":"64","map":{"@width":"5","@height":"8","@type":"BINARY","$":"00010101000100000001010001010101000101010100010101010000000000010101010000000000"}},{"@chr":"65","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0001010101000001010101010100000101000001010000010100000100000000"}},{"@chr":"66","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0101010101000001010101010100000101000001010000010101010100000000"}},{"@chr":"67","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0001010101000001010000000100000001000000010000010001010100000000"}},{"@chr":"76","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000001000000010000000100000001000000010000000101010100000000"}},{"@chr":"77","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000101010001010001010100000101000001010000010100000100000000"}},{"@chr":"78","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000101010001010001010100000101000001010000010100000100000000"}},{"@chr":"79","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0001010101000001010000010100000101000001010000010001010100000000"}},{"@chr":"72","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000101000001010101010100000101000001010000010100000100000000"}},{"@chr":"73","map":{"@width":"3","@height":"8","@type":"BINARY","$":"010101000100000100000100000100000100010101000000"}},{"@chr":"74","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000100000001000000010000000100000001010000010001010100000000"}},{"@chr":"75","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000101000001010101000100000101000001010000010100000100000000"}},{"@chr":"85","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000101000001010000010100000101000001010000010001010100000000"}},{"@chr":"84","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0101010100000100000001000000010000000100000001000000010000000000"}},{"@chr":"87","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000101000001010000010100000101000101010100010100000100000000"}},{"@chr":"86","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000101000001010000010100000100010001000100010000010000000000"}},{"@chr":"81","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0001010101000001010000010100000101000001010000010001010100000000"}},{"@chr":"80","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0101010101000001010101010100000001000000010000000100000000000000"}},{"@chr":"83","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0001010101000000000101010000000100000001010000010001010100000000"}},{"@chr":"82","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0101010101000001010101010100000101000001010000010100000100000000"}},{"@chr":"93","map":{"@width":"3","@height":"8","@type":"BINARY","$":"010101000001000001000001000001000001010101000000"}},{"@chr":"92","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000000010000000100000000010000000001000000010000000100000000"}},{"@chr":"95","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000001010101"}},{"@chr":"94","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000010000010001010000010000000000000000000000000000000000000000"}},{"@chr":"89","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000100010001000001000000010000000100000001000000010000000000"}},{"@chr":"88","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000100010001000001000001000101000001010000010100000100000000"}},{"@chr":"91","map":{"@width":"3","@height":"8","@type":"BINARY","$":"010101010000010000010000010000010000010101000000"}},{"@chr":"90","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0101010100000001000000010000010000010000010000000101010100000000"}},{"@chr":"102","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000010100010000010101010001000000010000000100000001000000000000"}},{"@chr":"103","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000000101010100000101000001000101010000000101010101"}},{"@chr":"100","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000100000001000101010100000101000001010000010001010100000000"}},{"@chr":"101","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000000101010100000101010101010000000001010100000000"}},{"@chr":"98","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000001000000010001010101000101000001010000010101010100000000"}},{"@chr":"99","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000000101010100000101000000010000010001010100000000"}},{"@chr":"97","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000000101010000000100010101010000010001010100000000"}},{"@chr":"110","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000010101010100000101000001010000010100000100000000"}},{"@chr":"111","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000000101010100000101000001010000010001010100000000"}},{"@chr":"108","map":{"@width":"2","@height":"8","@type":"BINARY","$":"01000100010001000100010000010000"}},{"@chr":"109","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000010100010100010101000101010000010100000100000000"}},{"@chr":"106","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000100000000000000010000000100000001010000010100000100010101"}},{"@chr":"107","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000001000000010000010100010001010000010001000100000100000000"}},{"@chr":"104","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0100000001000000010001010101000101000001010000010100000100000000"}},{"@chr":"105","map":{"@width":"1","@height":"8","@type":"BINARY","$":"0100010101010100"}},{"@chr":"119","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000010000010100000101000101010001010001010100000000"}},{"@chr":"118","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000010000010100000101000001000100010000010000000000"}},{"@chr":"117","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000010000010100000101000001010000010001010100000000"}},{"@chr":"116","map":{"@width":"3","@height":"8","@type":"BINARY","$":"000100010101000100000100000100000100000001000000"}},{"@chr":"115","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000000101010100000000010101000000010101010100000000"}},{"@chr":"114","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000010001010101000101000000010000000100000000000000"}},{"@chr":"113","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000000101010100000101000001000101010000000100000001"}},{"@chr":"112","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000010001010101000101000001010101010100000001000000"}},{"@chr":"124","map":{"@width":"1","@height":"8","@type":"BINARY","$":"0101010101010101"}},{"@chr":"122","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000010101010000000100000100000100000101010100000000"}},{"@chr":"121","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000010000010100000101000001000101010000000101010101"}},{"@chr":"120","map":{"@width":"4","@height":"8","@type":"BINARY","$":"0000000000000000010000010001000100000100000100010100000100000000"}}]}}}'),
        agla16: this.Font('agla16', '{"font":{"glyphs":{"glyph":[{"@chr":"34","map":{"@width":"5","@height":"8","@type":"BINARY","$":"00010000010101000101010000010000000000000000000000000000000000000000000000000000"}},{"@chr":"35","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000001010001010000000001010001010000010101010101010101010101010101010101000001010001010000000001010001010000010101010101010101010101010101010101000001010001010000000001010001010000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"32","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"33","map":{"@width":"2","@height":"16","@type":"BINARY","$":"0101010101010101010101010101010101010101000000000101010100000000"}},{"@chr":"38","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000000000000000000001010000000000000100000100000000000100000100000000000100000100000000000001010000000000000001010000000000000100000100000000010000000001000001010000000000010100010000000000010100010000000001000001000101010100000001000000000000000000000000000000000000000000000000000000"}},{"@chr":"39","map":{"@width":"2","@height":"8","@type":"BINARY","$":"01010101000101000000000000000000"}},{"@chr":"36","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000010001000000000000010001000000000000010001000000000101010101010100010101010101010101010100010001000000010101010101010100000101010101010101000000010001000001010101010101010101000101010101010100000000010001000000000000010001000000000000010001000000000000000000000000000000000000000000"}},{"@chr":"37","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000000000000000010100000000000101010100000000000101000000000000000101000000000000010100000000000001010000000000000101000000000000010100000000000001010000000000000101000000000000010100000000000000010100000000000101010100000000000101000000000000000000000000000000000000000000000000000000"}},{"@chr":"42","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000000000000000000000000100000000010000000100000001000100000100000100000001000100010000000000010101000000010101010101010101000000010101000000000001000100010000000100000100000100010000000100000001000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"43","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000101000000000000010100000000000001010000000101010101010101010101010101010100000001010000000000000101000000000000010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"40","map":{"@width":"3","@height":"16","@type":"BINARY","$":"000001000101010100010100010100010100010100010100010100010100010100010100000101000001000000000000"}},{"@chr":"41","map":{"@width":"3","@height":"16","@type":"BINARY","$":"010000010100000101000101000101000101000101000101000101000101000101000101010100010000000000000000"}},{"@chr":"46","map":{"@width":"2","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000010101010000000000000000"}},{"@chr":"47","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000000000000101000000000000000101000000000000000101000000000000000101000000000000010100000000000001010000000000000101000000000000010100000000000001010000000000000101000000000000010100000000000000010100000000000000010100000000000000010100000000000000000000000000000000000000000000000000"}},{"@chr":"44","map":{"@width":"3","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000101000101000101010100000000000000000000"}},{"@chr":"45","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"51","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000001010101010000000101010101010100010101000000010101010100000000000101000000000000000101000000000000010101000000010101010100000000010101010100000000000000010101000000000000000101010100000000000101010101000000010101000101010101010100000001010101010000000000000000000000000000000000000000"}},{"@chr":"50","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000001010101010000000101010101010100010101000000010101010100000000000101000000000000000101000000000000010101000000000001010100000000000101010000000000010101000000000001010100000000000101010000000000010101000000000000010101010101010101010101010101010101000000000000000000000000000000000000"}},{"@chr":"49","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000000101000000000000010101000000000001010101000000000001010101000000000000000101000000000000000101000000000000000101000000000000000101000000000000000101000000000000000101000000000000000101000000000000000101000000000000000101000000000000000101000000000000000000000000000000000000000000"}},{"@chr":"48","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000001010101010000000101010101010100010101000000010101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010101000000010101000101010101010100000001010101010000000000000000000000000000000000000000"}},{"@chr":"55","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010101010101010101010101010101010101000000000000000101000000000000000101000000000000010100000000000000010100000000000001010000000000000101000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000000000000000000000000000000000"}},{"@chr":"54","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000001010101010000000101010101010100010100000000000101010100000000000000010100000000000000010100010101010000010101010101010100010101000000010101010100000000000101010100000000000101010100000000000101010101000000010101000101010101010100000001010101010000000000000000000000000000000000000000"}},{"@chr":"53","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010101010101010101010101010101010101010100000000000000010100000000000000010100000000000000010101010101010000010101010101010100000000000000010101000000000000000101000000000000000101000000000000000101010101000000010101000101010101010100000001010101010000000000000000000000000000000000000000"}},{"@chr":"52","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000000000010100000000000001010100000000000101010100000000010101010100000001010100010100000101010000010100010101000000010100010100000000010100010101010101010101010101010101010101000000000000010100000000000000010100000000000000010100000000000000010100000000000000000000000000000000000000"}},{"@chr":"59","map":{"@width":"2","@height":"16","@type":"BINARY","$":"0000000000000000000001010101000000000000010101010001010000000000"}},{"@chr":"58","map":{"@width":"2","@height":"16","@type":"BINARY","$":"0000000000000000000001010101000000000000010101010000000000000000"}},{"@chr":"57","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000001010101010000000101010101010100010101000000010101010100000000000101010100000000000101010100000000000101010101000000010101000101010101010101000001010101000101000000000000000101000000000000000101010101000000010101000101010101010100000001010101010000000000000000000000000000000000000000"}},{"@chr":"56","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000001010101010000000101010101010100010101000000010101010100000000000101010101000000010101000101010101010100000001010101010000000101010101010100010101000000010101010100000000000101010100000000000101010101000000010101000101010101010100000001010101010000000000000000000000000000000000000000"}},{"@chr":"63","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000010101010000000101010101010001010100000101010101000000000101000000000001010000000000010100000000000101000000000000010100000000000001010000000000000101000000000000000000000000000000000000000000000101000000000000010100000000000000000000000000000000000000"}},{"@chr":"62","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000000000000000000101010000000000000001010100000000000000010101000000000000000101010000000000000001010100010101010101010101010101010101010101000000000001010100000000000101010000000000010101000000000001010100000000000101010000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"61","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000000000000000000000000000000000000000010101010101010101010101010101010101000000000000000000000000000000000000010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"60","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000000000000000000000000001010100000000000101010000000000010101000000000001010100000000000101010000000000010101010101010101010101010101010101000101010000000000000001010100000000000000010101000000000000000101010000000000000001010100000000000000000000000000000000000000000000000000000000"}},{"@chr":"68","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010101010101010000010101010101010100010100000000010101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000010101010101010101010100010101010101010000000000000000000000000000000000000000"}},{"@chr":"69","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010101010101010101010101010101010101010100000000000000010100000000000000010100000000000000010100000000000000010101010101010000010101010101010000010100000000000000010100000000000000010100000000000000010100000000000000010101010101010101010101010101010101000000000000000000000000000000000000"}},{"@chr":"70","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010101010101010101010101010101010101010100000000000000010100000000000000010100000000000000010101010101010000010101010101010000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000000000000000000000000000000000000000"}},{"@chr":"71","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000001010101010000000101010101010100010101000000010101010100000000000101010100000000000000010100000000000000010100000000000000010100000001010101010100000001010101010100000000000101010100000000000101010101000000010101000101010101010100000001010101010000000000000000000000000000000000000000"}},{"@chr":"64","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000001010101010000000101010101010100010101000000010101010100000000000101010100000000000101010100000000000101010100010101010101010100010101010100010100000000000000010100000000000000010100000000000101010101000000010101000101010101010100000001010101010000000000000000000000000000000000000000"}},{"@chr":"65","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000000010101000000000001010101010000000101000000010100010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010101010101010101010101010101010101010100000000000101010100000000000101010100000000000101010100000000000101000000000000000000000000000000000000"}},{"@chr":"66","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010101010101010000010101010101010100010100000000010100010100000000010100010100000000010100010101010101010000010101010101010100010100000000010101010100000000000101010100000000000101010100000000000101010100000000010101010101010101010100010101010101010000000000000000000000000000000000000000"}},{"@chr":"67","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000001010101010000000101010101010100010101000000010101010100000000000101010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000101010101000000010101000101010101010100000001010101010000000000000000000000000000000000000000"}},{"@chr":"76","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010101010101010101010101010101010101000000000000000000000000000000000000"}},{"@chr":"77","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010100000000000101010101000000010101010101010001010101010101010101010101010100010101000101010100000100000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101000000000000000000000000000000000000"}},{"@chr":"78","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010100000000000101010100000000000101010101000000000101010101000000000101010101010000000101010100010100000101010100010101000101010100000101000101010100000001010101010100000000010101010100000000010101010100000000000101010100000000000101010100000000000101000000000000000000000000000000000000"}},{"@chr":"79","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000001010101010000000101010101010100010101000000010101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010101000000010101000101010101010100000001010101010000000000000000000000000000000000000000"}},{"@chr":"72","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010101010101010101010101010101010101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101000000000000000000000000000000000000"}},{"@chr":"73","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000101010100000001010000000001010000000001010000000001010000000001010000000001010000000001010000000001010000000001010000000001010000000001010000000001010000000101010100000000000000000000000000"}},{"@chr":"74","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000000000101000000000101000000000101000000000101000000000101000000000101000000000101000000000101000000000101000000000101000000000101000000010101010101010100010101010000000000000000000000000000"}},{"@chr":"75","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010100000000000000010100000000000100010100000000010100010100000001010000010100000101000000010100010100000000010101010000000000010101010100000000010100010101000000010100000101010000010100000001010100010100000000010101010100000000000101010100000000000101000000000000000000000000000000000000"}},{"@chr":"85","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010101000000010101000101010101010100000001010101010000000000000000000000000000000000000000"}},{"@chr":"84","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0101010101010101010101010101010100000001010000000000000101000000000000010100000000000001010000000000000101000000000000010100000000000001010000000000000101000000000000010100000000000001010000000000000101000000000000010100000000000000000000000000000000000000"}},{"@chr":"87","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000100000101010100000100000101010100000100000101010100000100000101010100000100000101010100010101000101010101010101010101010100010101000101010000000100000001000000000000000000000000000000000000"}},{"@chr":"86","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101000101000000010100000001010101010000000000010101000000000000000100000000000000000000000000000000000000000000"}},{"@chr":"81","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000001010101010000000101010101010100010101000000010101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100000000000101010100010100000101010100000101000101010101000001010101000101010101010100000001010101000101000000000000000000000000000000000000"}},{"@chr":"80","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010101010101010000010101010101010100010100000000010101010100000000000101010100000000000101010100000000010101010101010101010100010101010101010000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000010100000000000000000000000000000000000000000000000000"}},{"@chr":"83","map":{"@width":"9","@height":"16","@type":"BINARY","$":"000001010101010000000101010101010100010101000000010101010100000000000101010100000000000000010101000000000000000101010101010000000001010101010100000000000000010101000000000000000101010100000000000101010101000000010101000101010101010100000001010101010000000000000000000000000000000000000000"}},{"@chr":"82","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010101010101010000010101010101010100010100000000010101010100000000000101010100000000000101010100000000010101010101010101010100010101010101010000010100000001010100010100000000010101010100000000000101010100000000000101010100000000000101010100000000000101000000000000000000000000000000000000"}},{"@chr":"93","map":{"@width":"6","@height":"16","@type":"BINARY","$":"010101010101010101010101000000000101000000000101000000000101000000000101000000000101000000000101000000000101000000000101000000000101000000000101010101010101010101010101000000000000000000000000"}},{"@chr":"92","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000010100000000000001010000000000000101000000000000000101000000000000000101000000000000000101000000000000010100000000000000010100000000000001010000000000000001010000000000000001010000000000000101000000000000010100000000000000000000000000000000"}},{"@chr":"95","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000101010101010101010101010101010100000000000000000000000000000000"}},{"@chr":"94","map":{"@width":"8","@height":"8","@type":"BINARY","$":"00000001010000000000010101010000000101000001010001010000000001010000000000000000000000000000000000000000000000000000000000000000"}},{"@chr":"89","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0101000000000101010100000000010101010000000001010101000000000101010100000000010100010100000101000000010101010000000000010100000000000001010000000000000101000000000000010100000000000001010000000000000101000000000000010100000000000000000000000000000000000000"}},{"@chr":"88","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010100000000000101010100000000000101010100000000000101010100000000000101000101000000010100000001010001010000000000010101000000000000010101000000000001010001010000000101000000010100010100000000000101010100000000000101010100000000000101010100000000000101000000000000000000000000000000000000"}},{"@chr":"91","map":{"@width":"6","@height":"16","@type":"BINARY","$":"010101010101010101010101010100000000010100000000010100000000010100000000010100000000010100000000010100000000010100000000010100000000010100000000010101010101010101010101000000000000000000000000"}},{"@chr":"90","map":{"@width":"9","@height":"16","@type":"BINARY","$":"010101010101010101010101010101010101000000000000010101000000000001010100000000000101010000000000000101010000000000010101000000000001010100000000000101010000000000000101010000000000010101000000000000010100000000000000010101010101010101010101010101010101000000000000000000000000000000000000"}},{"@chr":"102","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000101010000000001010101000000000101000000000001010101010000000101010101000000000101000000000000010100000000000001010000000000000101000000000000010100000000000001010000000000000101000000000000010100000000000001010000000000000000000000000000000000000000"}},{"@chr":"103","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000001010100010100010101010101010101010000010101010100000000010101010000000001010101000000000101010101000001010100010101010101010000010101000101000000000000010100000000000001010001010101010100000001010101000000000000000000000000000000000000"}},{"@chr":"100","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000101000000000000010100000000000001010000000000000101000000000000010100000101010001010001010101010101010101000001010101010000000001010101000000000101010100000000010101010100000101010001010101010101000001010100010100000000000000000000000000000000"}},{"@chr":"101","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000010101010000000101010101010001010000000001010101000000000101010101010101010101010101010101010101000000000000010100000000000001010100000001010001010101010100000001010101000000000000000000000000000000000000"}},{"@chr":"98","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0101000000000000010100000000000001010000000000000101000000000000010100000000000001010001010100000101010101010100010101000001010101010000000001010101000000000101010100000000010101010100000101010101010101010100010100010101000000000000000000000000000000000000"}},{"@chr":"99","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000010101010000000101010101010001010100000101010101000000000000010100000000000001010000000000000101000000000000010100000000000001010100000101010001010101010100000001010101000000000000000000000000000000000000"}},{"@chr":"96","map":{"@width":"2","@height":"8","@type":"BINARY","$":"01010101000101000000000000000000"}},{"@chr":"97","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000001010101010100010101010101010100000000000001010000000000000101000101010101010101010101010001010101000000000101010100000000010101010000000001010101010101010101000101010100010100000000000000000000000000000000"}},{"@chr":"110","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000101000101010100010101010101010101010100000001010101000000000101010100000000010101010000000001010101000000000101010100000000010101010000000001010101000000000101010100000000010100000000000000000000000000000000"}},{"@chr":"111","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000000010101010000000101010101010001010100000101010101000000000101010100000000010101010000000001010101000000000101010100000000010101010100000101010001010101010100000001010101000000000000000000000000000000000000"}},{"@chr":"108","map":{"@width":"4","@height":"16","@type":"BINARY","$":"00010100000101000001010000010100000101000001010000010100000101000001010000010100000101000001010000010100000101000000000000000000"}},{"@chr":"109","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000101010001010100010101010101010101010001010001010101000101000101010100010100010101010001010001010101000101000101010100010100010101010001010001010101000101000101010100010100010100000000000000000000000000000000"}},{"@chr":"106","map":{"@width":"5","@height":"16","@type":"BINARY","$":"0000000000000000010100000001010000000000000000010100000001010000000101000000010100000001010000000101000000010100000101010101010100010101000000000000000000000000"}},{"@chr":"107","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000101000000010100010100000001010001010000010100000101000101000000010101010000000001010101000000000101000101000000010100000101000001010000000101000101000000010101010100000000010100000000000000000000000000000000"}},{"@chr":"104","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0101000000000000010100000000000001010000000000000101000000000000010100000000000001010001010101000101010101010101010101000000010101010000000001010101000000000101010100000000010101010000000001010101000000000101010100000000010100000000000000000000000000000000"}},{"@chr":"105","map":{"@width":"4","@height":"16","@type":"BINARY","$":"00000000000101000001010000000000000101000001010000010100000101000001010000010100000101000001010000010100000101000000000000000000"}},{"@chr":"119","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000101000000000101010100000000010101010000000001010101000101000101010100010100010101010001010001010101000101000101010100010100010101010101010101010101000101000101000100010100010000000000000000000000000000000000"}},{"@chr":"118","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000101000000000101010100000000010101010000000001010101000000000101010100000000010101010000000001010101000000000101010100000000010100010100000101000000010101010000000000010100000000000000000000000000000000000000"}},{"@chr":"117","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000101000000000101010100000000010101010000000001010101000000000101010100000000010101010000000001010101000000000101010100000000010101010000000101010101010101010101000101010100010100000000000000000000000000000000"}},{"@chr":"116","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000000000000001010000000000010100000000000101000000000101010101000001010101010000000101000000000001010000000000010100000000000101000000000001010000000000010100000000000101010100000000010101000000000000000000000000000000"}},{"@chr":"115","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000001010101010100010101010101010101010000000000000101000000000000010101010101010000010101010101010000000000000101000000000000010100000000000001010101010101010101000101010101010000000000000000000000000000000000"}},{"@chr":"114","map":{"@width":"6","@height":"16","@type":"BINARY","$":"000000000000000000000000000000000000010100010101010101010101010101000000010101000000010100000000010100000000010100000000010100000000010100000000010100000000010100000000000000000000000000000000"}},{"@chr":"113","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000001010100010100010101010101010101010000010101010100000000010101010000000001010101000000000101010101000001010100010101010101010000010101000101000000000000010100000000000001010000000000000101000000000000010100000000000000000000000000000000"}},{"@chr":"112","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000010100010101000001010101010101000101010000010101010100000000010101010000000001010101000000000101010101000001010101010101010101000101000101010000010100000000000001010000000000000101000000000000010100000000000000000000000000000000000000000000"}},{"@chr":"125","map":{"@width":"7","@height":"16","@type":"BINARY","$":"01010100000000000001010000000000000101000000000001010000000000010100000000000101000000000001010000000000000101010000000101000000000001010000000000010100000000000101000000000101000000010101000000000000000000000000000000000000"}},{"@chr":"124","map":{"@width":"2","@height":"16","@type":"BINARY","$":"0101010101010101010100000000000000000101010101010101010100000000"}},{"@chr":"123","map":{"@width":"7","@height":"16","@type":"BINARY","$":"00000000010101000000010100000000010100000000000101000000000001010000000000010100000000000101000000010101000000000000010100000000000101000000000001010000000000010100000000000001010000000000000101010000000000000000000000000000"}},{"@chr":"122","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000101010101010101010101010101010100000000000001010000000000010100000000000101000000000001010000000000010100000000000101000000000001010000000000000101010101010101010101010101010100000000000000000000000000000000"}},{"@chr":"121","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000101000000000101010100000000010101010000000001010101000000000101010101000001010100010101010101010000010101000101000000000000010100000000000001010001010101010100000001010101000000000000000000000000000000000000"}},{"@chr":"120","map":{"@width":"8","@height":"16","@type":"BINARY","$":"0000000000000000000000000000000000000000000000000101000000000101010100000000010101010000000001010001010000010100000001010101000000000001010000000000010101010000000101000001010001010000000001010101000000000101010100000000010100000000000000000000000000000000"}}]}}}')
    };
    return {
        getFont: function (name) {
            // Checking the name:
            if (name === undefined) {
                return undefined;
            }

            // Checking the existence of the font:
            if (fonts[name] === undefined) {
                alert('TODO: Caricamento font');
            }

            // Here the font must be present:
            if (fonts[name] === undefined) {
                return undefined;
            }

            // Done:
            return fonts[name];
        },
        // JQuery wrapper as parameter.
        releaseGlyphs: function (glyphs) {
            // Checking:
            if (glyphs === undefined || glyphs.length <= 0) {
                return;
            }

            // Iterating on the glyphs:
            var manager = this;
            glyphs.each(function (i, g) {
                // Releasing the glyph:
                g = $(g);
                var font = manager.getFont(g.attr('font'));
                if (font === undefined) {
                    g.remove();
                }
                else {
                    font.releaseGlyph(g);
                }
            });
        }
    };
};