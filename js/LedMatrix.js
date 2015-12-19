/**
 * Return a variable containing everything that is marked with this
 */
LedMatrix = function (elemid, options) {
    // ------------- Public Tools -------------
    // add an editable windows
    this.addWindow = function () {
        if (self.displayArea.select(".selectedWindow").empty() && self.displayArea.select(".editingWindow").empty()) {
            // remove the listener for deselection
            disableDeselectAll();

            // stop preview mode
            stopAnimation();


            // create a new brush inside the displayArea
            var brush = d3.svg.brush()
                .x(d3.scale.identity().domain([0, self.size.width]))
                .y(d3.scale.identity().domain([0, self.size.height]))
                .on("brushend", brushed);

            self.displayArea.append("g")
                .attr("class", "editingWindow")
                .call(brush);

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

            // create a new brush inside the displayArea at the saved position
            var brush = d3.svg.brush()
                .x(d3.scale.identity().domain([0, self.size.width]))
                .y(d3.scale.identity().domain([0, self.size.height]))
                .extent([[pos.x, pos.y], [pos.width, pos.height]])
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

                // applay snap
                d3.select(this).transition()
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
                duration: 10,
                spent: 0,
                selectedPage: 0,
                scrollStep: 0,
                scrollSpeed: 1
            }];

            if (temp.datum() != 0) {
                data[0] = temp.datum();
            }

            var svg = self.displayArea.append("svg")
                .attr("x", temp.attr("x"))
                .attr("y", temp.attr("y"))
                .attr("width", temp.attr("width"))
                .attr("height", temp.attr("height"))
                .attr("class", "windowGroup");

            // create a new window with data in the drawn position
            var w = svg.selectAll(".windowGroup")
                .data(data)
                .enter()
                .append("rect")
                .attr("class", "window")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", temp.attr("width"))
                .attr("height", temp.attr("height"))
                .on("click", manageSelection)
                .classed('textEdit', true);

            // save the window reference in the model
            self.displayArea.window.push(w);

            // add the listener for deselection
            enableDeselectAll();

            if (data[0].pages[data[0].selectedPage].message.length != 0) {
                var edit = $(".textEdit");
                // if is a paged message
                if (data[0].type == "page") {
                    w.classed(data[0].type, true);
                    writePageText(data[0].pages[data[0].selectedPage], edit.parent());
                }
                // if is a paged message
                else if (data[0].type == "scroll") {
                    w.classed(data[0].type, true);
                    data[0].preview = 0;
                    writeAllScrollText(data[0].pages[data[0].selectedPage], edit.parent());
                }
            }

            w.classed('textEdit', false)
                .classed('selectedWindow', true);

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
                if (self.displayArea.window[i].datum().remove == true) {
                    $(".selectedWindow").parent().remove();
                    self.displayArea.window.splice(i, 1);
                }
            }
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
                .on("click", moveCursor)
                .classed('textEdit', true)
                .classed('scroll', true);

            w.datum().type = "scroll";

            // turn on the cursor
            self.cursorScrollOn();

            // stop preview mode
            stopAnimation();

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
            }

            edit.on("click", manageSelection)
                .classed('textEdit', false)
                .classed('selectedWindow', true);

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

    this.selectBlink  = function (id) {
        if (id === undefined) id = 'off';

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
                if (data.message[i] != '\n') {
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

                $('.displayArea').append(Line(data.cursorCurrXPos, data.cursorCurrYPos, data.cursorCurrXPos, h, self.options.offsetSize * 2, "cursor"));

                if (self.cursorBlinkTimer == null) {
                    // init the cursor blinking timer
                    self.cursorBlinkTimer = setInterval(cursorBlink, 500);
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

                $('.displayArea').append(Line(data.cursorCurrXPos + self.options.offsetSize, data.cursorCurrYPos, data.cursorCurrXPos + self.options.offsetSize, h, self.options.offsetSize * 2, "cursor"));

                if (self.cursorBlinkTimer == null) {
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

    this.speedUp = function(){
        var w = self.displayArea.select(".selectedWindow", ".scroll");
        if (!w.empty()) {
            var data = w.datum();

            if (data.scrollSpeed > 1) {
                data.scrollSpeed--;
            }
        }
    };

    this.speedDown = function(){
        var w = self.displayArea.select(".selectedWindow", ".scroll");
        if (!w.empty()) {
            var data = w.datum();

            if (data.scrollSpeed < 4) {
                data.scrollSpeed++;
            }
        }
    };
        // ------------- Do Stuff -------------
    // init some data
    var self = this;
    var refreshView = 15;
    this.matrix = document.getElementById(elemid);
    this.options = options || {};
    this.options.horPixel = options.horPixel || 40;
    this.options.verPixel = options.verPixel || 30;
    this.options.pixelSize = options.pixelSize || 10;
    this.options.percent = options.percent || 0.2;
    this.options.offsetSize = this.options.pixelSize * this.options.percent;
    this.options.totPixelSize = this.options.pixelSize + this.options.offsetSize;

    this.size = {
        width: this.options.horPixel * this.options.pixelSize + (this.options.horPixel + 1) * this.options.offsetSize,
        height: this.options.verPixel * this.options.pixelSize + (this.options.verPixel + 1) * this.options.offsetSize
    };

    // create the display
    this.displayArea = d3.select(this.matrix).append("svg")
        .attr("width", this.size.width)
        .attr("height", this.size.height)
        .attr("class", "displayArea");

    var gGrid = SVG("g")
        .attr("class", "background-grid");

    this.displayArea.grid = $(".displayArea").append(gGrid);

    // init data for ledGrid
    for (var y = this.options.offsetSize / 2; y <= this.size.height; y += this.options.totPixelSize) {
        $(".background-grid").append(Line(0, y, this.size.width, y, this.options.offsetSize, "gridLine"));
    }
    for (var x = this.options.offsetSize / 2; x <= this.size.width; x += this.options.totPixelSize) {
        $(".background-grid").append(Line(x, 0, x, this.size.height, this.options.offsetSize, "gridLine"));
    }

    // init displayArea structure
    this.displayArea.window = [];

    // init cursor stuff
    this.cursor = null;
    this.cursorBlinkTimer = null;

    // init font
    this.fontManager = FontManager();
    this.selectFont();

    // init blink
    this.selectBlink();

    // init preview stuff
    this.previewTimer = null;

    // ------------- Private Tools -------------
    // mark the window as selectedWindow and unselect all the other
    function manageSelection() {
        if (d3.select(this).classed("selectedWindow")) {
            d3.select(this).classed('selectedWindow', false);
        } else {
            deselectAllWindows();
            d3.select(this).classed('selectedWindow', true);
        }

        d3.event.preventDefault();
        d3.event.stopPropagation();
    }

    // deselect all windows
    function deselectAllWindows() {
        d3.selectAll(".selectedWindow").classed('selectedWindow', false);

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
        if (self.cursor.attr("visibility") == "hidden") {
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

        if (data.message.length != 0) {
            for (i = 0; i < data.message.length; i++) {
                var p = $(parent[i]);
                var charY = parseFloat(p.attr("dy"));

                if (prevY != charY) {
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

            if (rowIndex != null) {
                var xS = [];
                for (j in row[rowIndex]) {
                    xS.push(parseFloat(row[rowIndex][j].attr("dx")));
                }

                xS.push(parseFloat(row[rowIndex][j].attr("dx")) + parseFloat(row[rowIndex][j].attr("width")));

                var closest = xS.reduce(function (prev, curr) {
                    return (Math.abs(curr - clickX) < Math.abs(prev - clickX) ? curr : prev);
                });

                for (j in row[rowIndex]) {
                    if (parseFloat(row[rowIndex][j].attr("dx")) == closest) {
                        nearest = parseFloat(row[rowIndex][j].attr("index"));
                    }
                }

                if (nearest == null) {
                    data.cursorIndex = parseFloat(row[rowIndex][row[rowIndex].length - 1].attr("index")) + 1;
                } else {
                    data.cursorIndex = nearest;
                }
            } else {
                data.cursorIndex = parseFloat(row[row.length - 1][row[row.length - 1].length - 1].attr("index")) + 1
            }

            // Refreshing the font:
            self.refreshCursor(data);
        }
    }

    function startAnimation() {
        if (self.previewTimer == null) {
            // start preview mode
            self.previewTimer = setInterval(playAnimation, refreshView);
        }
    }

    function stopAnimation() {
        clearInterval(self.previewTimer);
        self.previewTimer = null;
    }

    function playAnimation() {
        d3.selectAll(".windowGroup").each(function () {
            var data = d3.select(this).select(".window").datum();
            var parent = $(this);

            if (data.type == "scroll") {
                var firstPage = data.pages[data.selectedPage];
                var chars = parent.find("g.char");
                var minX = $(chars[0]).attr("dx");
                var char;
                var newX;
                var i;

                if (data.scrollStep == 0) {
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
                } else if (data.scrollStep % data.scrollSpeed == 0) {
                    for (i = firstPage.message.length - 1; i >= 0; i--) {
                        char = $(chars[i]);
                        newX = parseFloat(char.attr("dx")) - self.options.totPixelSize;
                        char.attr("transform", "translate(" + newX + "," + parseFloat(char.attr("dy")) + ")")
                            .attr("dx", newX);
                    }
                }

                if (parseFloat($(chars[chars.length-1]).attr("dx")) + (parseFloat($(chars[chars.length-1]).attr("width"))) < 0) {
                    data.scrollStep = 0;
                } else {
                    data.scrollStep++;
                }
            }
            else if (data.type == "page") {
                if (data.spent < data.duration) {
                    data.spent += refreshView/1000;
                } else {
                    data.spent = 0;
                    if (data.selectedPage == data.pages.length - 1) {
                        data.selectedPage = 0;
                    } else {
                        data.selectedPage++;
                    }
                    writeAllPageText(data.pages[data.selectedPage], parent);
                }
            }
        })
    }
};