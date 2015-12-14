/**
 * Created by paolosilini on 04/12/15.
 */
var pixelSize;
var pixelOffset;
var pixelSizeTot;
var size = {
    width: 0,
    height: 0
};

SVG = function (tag) {
    return $(document.createElementNS('http://www.w3.org/2000/svg', tag));
};

Line = function (x1, y1, x2, y2, strokeWidth, klass) {
    return SVG('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke-width', strokeWidth)
        .attr('class', klass);
};

writePageText = function (data, location) {
    var area = location.find(".textEdit");
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
        if (data.message[i] != '\n') {
            // if the occupation is outside the windows width
            if (xPos + data.font[i].getWidth(data.message[i]) + pixelSizeTot > x + w + pixelSizeTot / 2) {
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
                .attr("index", i);

            location.append(g);
            $(g).insertBefore(".textEdit");

            // increment x pos of te glyph width
            xPos += data.font[i].getWidth(data.message[i]) + pixelSizeTot;
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
            var g = SVG("g")
                .attr('transform', 'translate(' + xPos + ',' + yPos + ')')
                .attr('width', 1)
                .attr('height', data.font[i].getHeight())
                .attr("dx", xPos - x)
                .attr("dy", yPos - y)
                .attr("index", i)
                .attr('class', "char");

            location.append(g);
            $(g).insertBefore(".textEdit");
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
        if (!(yPos > size.height)) {
            // if is possible enlarge
            area.attr("height", yPos - y - pixelOffset);
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
};

writeScrollText = function (data, location) {
    var area = location.find(".textEdit");
    var x = parseFloat(area.attr("x"));
    var y = parseFloat(area.attr("y"));
    var w = parseFloat(area.attr("width"));
    var xPos = x + w;

    // save the used glyphs  in the font manager for time saving
    matrix.fontManager.releaseGlyphs(
        $(".textEdit").parent().find("g.char"));

    // from the index to the start
    for (var i = data.cursorIndex - 1; i >= 0; i--) {
        // if the occupation is not outside the windows width
        if (xPos - data.font[i].getWidth(data.message[i]) - pixelSizeTot >= x) {
            // decrement x pos of te glyph width
            xPos -= data.font[i].getWidth(data.message[i]);

            // insert the glyph
            var g = data.font[i].getGlyph(data.message[i])
                .attr('transform', 'translate(' + xPos + ',' + y + ')')
                .attr("dx", xPos - x)
                .attr("dy", 0)
                .attr("index", i);

            location.append(g);
            $(g).insertBefore(".textEdit");

            // decrement x pos of te glyph width
            xPos -= pixelSizeTot;
        } else {
            i = 0;
        }
    }
};

setLedDimension = function (pixelSize, offsetSize, totSize, size) {
    this.pixelSize = pixelSize;
    this.pixelOffset = offsetSize;
    this.pixelSizeTot = totSize;
    this.size.height = size.height;
    this.size.width = size.width;
};