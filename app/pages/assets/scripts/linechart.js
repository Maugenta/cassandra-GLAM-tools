let FILE_QUERY;
let SHOWN_SEC_LINE = false;

let queryParsed;

let makeAnnotations;
let ANNOTATION_EDIT_MODE = false;

let glamId = window.location.href.toString().split('/')[3];

$('#annotationModeCheckbox').click(function() {
  var self = this;
  if (self.checked) { // switching on
    $.get('/api/user/auth', function(data) {
      ANNOTATION_EDIT_MODE = true;
      $('#svg-graph').css('cursor', 'pointer');
    }).fail(function(err) {
      // Authorization failed
      self.checked = false;
      ANNOTATION_EDIT_MODE = false;
      $('#svg-graph').css('cursor', 'auto');
    });
  } else { // switching off
    ANNOTATION_EDIT_MODE = false;
    $('#svg-graph').css('cursor', 'auto');
    $('#annotationButtons').css('opacity', 0);
  }
});

const lineChartDraw = function (div, query) {
  // adapt to timespan (quarter, year, ...)
  queryParsed = document.createElement('a');
  queryParsed.href = query;

  FILE_QUERY = queryParsed.pathname + "/file/";

  d3.json(query, function(error, data) {
    if (error) {
      console.error(error);
    }

    $(document).ready(function() {
      lineChart(div, fixDataViz(data, 'date'));
    });
  });
};

function lineChart(div, data) {

  const svgGraph = $("#svg-graph");
  const divEl = $("#" + div);
  svgGraph.remove();

  let WINDOW_WIDTH = $(window).width();

  let margin = {};
  let margin2 = {};
  let availH;
  let yTicksNum = 10;
  let groupby2dateFormat = {
    'day': ['%Y-%m-%d', 6],
    // 'week': ['%Y w%W', 12],
    'week': ['%Y-%m', 7],
    'month': ['%Y-%m', 5],
    'quarter': ['%Y-%m',6],
    'year': ['%Y', 5]
  };

  if (WINDOW_WIDTH < 576) {  // smartphones
    availH = divEl.outerHeight();
    margin = { top: 10, right: 50, bottom: 140, left: 20 };
    margin2 = { top: availH - margin.bottom + 30, right: 15, bottom: 50, left: 15 };
    yTicksNum = 6;
    groupby2dateFormat = {
      'day': ['%Y-%m-%d', 3],
      // 'week': ['%Y w%W', 12],
      'week': ['%Y-%m', 3],
      'month': ['%Y-%m', 4],
      'quarter': ['%Y-%m', 4],
      'year': ['%Y', 4]
    };
  } else {
    // tablets and desktop
    availH = divEl.outerHeight() * 0.83;
    margin = { top: 60, right: 40, bottom: 140, left: 20 };
    margin2 = { top: availH - margin.bottom + 30, right: 40, bottom: 50, left: 20 };

  }

  const width = Math.round(divEl.outerWidth()) - margin.left - margin.right,
      height = availH - margin.top - margin.bottom,
      height2 = availH - margin2.top - margin2.bottom;

  const parseTime = d3.isoParse;

  // SCALE OBJECTS
  const x = d3.scaleTime().range([0, width]);
  const y = d3.scaleLog();
  // BRUSH SCALES
  const x2 = d3.scaleTime().range([0, width]);
  const y2 = d3.scaleLog().range([height2, 0]);

  let image_valueline, image_path, img_data;

  // Brush function
  const brush = d3.brushX()
                  .extent([[0, 0], [width, height2]])
                  .on("brush end", brushFunction);

  // Zoom Function
  const zoom = d3.zoom()
                  .scaleExtent([1, 80])
                  .translateExtent([[0, 0], [width, height]])
                  .extent([[0, 0], [width, height]])
                  .on("zoom", zoomFunction);

  // Main SVG
  const svg = d3.select("#" + div)
                .append("svg")
                .attr("id", "svg-graph")
                .style('position', 'relative')
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + ", 0)");


  // FORMAT DATA
  data.forEach(function(d) {
    d.date = parseTime(d.date);
    d.views = +d.views;
  });


  // SET DOMAINS
  x.domain(d3.extent(data, function(d) { return d.date; }));
  const minR = d3.min(data, function(d) { return d.views; });
  const minL = Math.log10(minR);
  const minY = Math.ceil(Math.pow(10,minL-0.18));
  const maxR = d3.max(data, function(d) { return d.views; });
  const maxL = Math.log10(maxR);
  const maxY = Math.ceil(Math.pow(10,maxL+0.1));
  y.domain([minY,maxY]).rangeRound([height,0]).clamp(true);
  // BRUSH DOMAINS
  x2.domain(x.domain());
  y2.domain(y.domain());

  // AXIS, draw ticks
  let xAxis;
  let xAxis2 = d3.axisBottom(x2);
  let groupBy = $('#groupby-select').val();
  xAxis = d3.axisBottom().scale(x).tickFormat(d3.timeFormat(
      groupby2dateFormat[groupBy][0]
  ))
      .ticks(groupby2dateFormat[groupBy][1]);

  if ( groupBy === "year"){
    xAxis2 =  d3.axisBottom(x2).tickFormat(d3.timeFormat('%Y')).ticks(5);
  }


  // let yTicksFiltered = y.ticks().slice(1,y.ticks().length-2).map(logFormat10).filter(tick => tick !== "").map(tick => Number(tick));
  // let yTicksFilteredWithDomain = yTicksFiltered.concat([y.ticks()[0],y.ticks()[y.ticks().length-1]]).sort((a,b) => a-b);
  const yAxis = function (params){
    const logFormat10 = y.tickFormat(yTicksNum);
    let yTicksFiltered = y.ticks().slice(1,y.ticks().length-2).map(logFormat10).filter(tick => tick !== "").map(tick => Number(tick));
    let yTicksFilteredWithDomain = yTicksFiltered.concat([y.ticks()[0],y.ticks()[y.ticks().length-1]]).sort((a,b) => a-b);
    d3.axisLeft(y)
        .tickValues(yTicksFilteredWithDomain)
        .tickFormat(d3.format(".0s"))(params);
  };

  // Clip path (clip line outside axis)
  svg.append("defs")
      .append("svg:clipPath")
      .attr("id", "clip")
      .append("svg:rect")
      .attr("id", "clip-rect")
      .attr("width", width)
      .attr("height", height)
      .attr("x", 0)
      .attr("y", 0);


  const lineChart = svg.append("g")
      .attr("class", "focus")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .attr("clip-path", "url(#clip)");


  const focus = svg.append("g")
      .attr("class", "focus")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const context = svg.append("g")
      .attr("class", "context")
      .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

  const valueline = d3.line()
      .x(function (d) {
        if (!d) {
          return 0;
        } else {
          return x(d.date);
        }
      })
      .y(function (d) {
        if (!d) {
          return 0;
        } else {
          return y(d.views);
        }
      })
      .curve(d3.curveStepAfter);

  const valueline2 = d3.line()
      .x(function (d) {
        if (!d) {
          return 0;
        } else {
          return x2(d.date);
        }
      })
      .y(function (d) {
        if (!d) {
          return 0;
        } else {
          return y2(d.views);
        }
      })
      .curve(d3.curveLinear);

  // GRID INSIDE THE GRAPH
  // focus.append("g")
  //      .attr("class", "grid")
  //      .attr("transform", "translate(0," + height + ")")
  //      .call(make_x_gridlines().tickSize(-height).tickFormat(""));
  //
  // focus.append("g")
  //      .attr("class", "grid")
  //      .call(make_y_gridlines().tickSize(-width).tickFormat(""));


  // DRAW AXIS
  const gX = focus.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  const gY = focus.append("g")
      .attr("class", "axis axis--y")
      .call(yAxis);

  context.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height2 + ")")
      .call(xAxis2);

  // Append data to main graph...
  const path = lineChart.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", valueline);

  // ...and to secondary graph
  context.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", valueline2);

  // append brush area
  const brushView = context.append("g")
      .attr("class", "brush")
      .call(brush)
      .call(brush.move, x.range());

  // append zoom area
  svg.append("rect")
      .attr("class", "zoom-area")
      .attr("width", width)
      .attr("height", height)
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .call(zoom);

  //  Label to display details (right top corner)
  const detailsLabel = svg.append("g").attr("class", "dateLabel");
  const bisect = function (data, value) {
    return d3.bisector(function (d) {
      return d.date;
    }).left(data, value) - 1;
  };
  const image_bisect = function (data, value) {
    return d3.bisector(function (d) {
      return d.access_date;
    }).left(data, value) - 1;
  };

  // Line across the plots on mouse pointer
  const verticalLine = focus.append("g").attr("class", "hover-line");

  // ANNOTATIONS
  const annotation_type = d3.annotationCalloutCircle;

  let annotations = [];

  // Append SVG group
  svg.append("g")
      .attr("class", "annotation-group")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .attr("clip-path", "url(#clip)");
  $('#annotationButtons').on('click', '.edit_button', function() {
    let note_id = $('#annotationButtons').data('noteid');
    let note_date = note_id.split('_')[0];
    let note = annotations.find(el => el.id === note_id);
    $('#note-form-title').text('EDIT ANNOTATION');
    $('#annotation_dialog_form').fadeInFlex();

    // Fill form with note data
    $('#note-text').val(note.note.label);
    $('#note-pos').val(note.note.position);

    /*** CANCEL ***/
    $('#annotation_dialog_form .cancel-button').off('click');
    $('#annotation_dialog_form .cancel-button').click(function() {
      // Restore chart interactivity
      restoreChart();
    });

    /*** CONFIRM ***/
    $('#annotation_dialog_form .confirm-button').off('click');
    $('#annotation_dialog_form .confirm-button').click(function() {
      if ($('#note-text').val() !== '') {
        // Disable button to avoid multiple API calls
        $('#annotation_dialog_form .confirm-button').addClass('full-disabled');
        // Get new values
        let text = $('#note-text').val();
        let pos = $('#note-pos').val();
        // API
        $.ajax({
          type: "PUT",
          url: '/api/admin/glams/' + glamId + '/annotations/' + note_date,
          headers: { "Content-Type": "application/json" },
          data: JSON.stringify({
            annotation: text,
            position: pos
          }),
          success: function() {
            // Restore chart interactivity
            restoreChart();
            // Remove old object
            annotations = annotations.filter(el => el.id !== note_id);
            // Compose new object
            let annotation_object = composeAnnotation({
              annotation: text,
              position: pos,
              date: note.data.date,
              value: note.data.close
            });
            // Update list and redraw annotations
            annotations.push(annotation_object);
            doAnnotation(annotations);
          },
          error: function(err) {
            alert("Something went wrong");
            restoreChart();
          }
        });
      } else {
        alert('Cannot add annotation with empty text');
      }
    });
  });

  $('#annotationButtons .delete_button').on('click', function() {
    let note_id = $('#annotationButtons').data('noteid');
    let note_date = note_id.split('_')[0];
    $.ajax({
      url: '/api/admin/glams/' + glamId + '/annotations/' + note_date,
      type: 'DELETE',
      success: function() {
        // Filter out and redraw annotations
        annotations = annotations.filter(el => el.id !== note_id);
        doAnnotation(annotations);
        // Restore
        restoreChart();
      },
      error: function(err) {
        alert('Something went wrong');
        // Restore
        restoreChart();
      }
    });
  });

  function restoreChart() {
    // Fade out menus
    $('#annotation_dialog_form').fadeOut(200);
    $('#annotationButtons').css('opacity', 0);
    // Empty textarea
    $('#note-text').val('');
    // Restore zoom and brush
    $('.zoom-area').removeClass('no-pointer-events');
    $('.brush').removeClass('no-pointer-events');
    // Restore buttons interactivity
    $('#annotation_dialog_form .confirm-button').removeClass('full-disabled');
    // Fade out temporary dots if present
    d3.selectAll('.note-dot').remove();
  }

  function disableChartInteractivity() {
    $('.zoom-area').addClass('no-pointer-events');
    $('.brush').addClass('no-pointer-events');
  }

  let NOTE_OVER = false;

  function doAnnotation(annotationsArray) {
    makeAnnotations = d3.annotation()
    // also can set and override in the note.padding property of the annotation object
    .notePadding(15)
    // .editMode(true)
    .type(annotation_type)
    // accessors & accessorsInverse not needed if using x, y in annotations JSON
    .accessors({
      x: d => x(parseTime(d.date)),
      y: d => y(d.close)
    }).accessorsInverse({
       date: d => timeFormat(x.invert(d.x)),
       close: d => y.invert(d.y)
    }).annotations(annotationsArray)
    .on('noteover', function(d) {
      NOTE_OVER = true;
      if (ANNOTATION_EDIT_MODE) this.select('.annotation-note-bg')
                                    .transition().attr('fill', '#FFCDD2');
    })
    .on('noteout', function() {
      NOTE_OVER = false;
      if (ANNOTATION_EDIT_MODE) this.select('.annotation-note-bg')
                                    .transition().attr('fill', '#fff');
    })
    .on('noteclick', function(d) {
      if ($('#annotation_dialog_form').is(':visible')) {
        $('#annotation_dialog_form .cancel-button').click();
      }
      if (ANNOTATION_EDIT_MODE) {
        let note_id = $('#annotationButtons').data('noteid');
        let buttons_visible = +$('#annotationButtons').css('opacity');
        if (!buttons_visible) { // menu is hidden
          // temporaily disable zoom and brush
          disableChartInteractivity();
          // show menu
          $('#annotationButtons').css('top', d3.event.pageY - 100)
                                 .css('left', d3.event.pageX + 50)
                                 .css('opacity', 1);
          // update data
          $('#annotationButtons').data('noteid', d.id);
        } else if (note_id !== d.id) { // menu is shown but click on another note
          // move menu
          $('#annotationButtons').css('top', d3.event.pageY - 100)
                                 .css('left', d3.event.pageX + 50);
          // update data
          $('#annotationButtons').data('noteid', d.id);
        } else { // menu is shown but click on same note
          // restore chart
          restoreChart();
        }
      }
    });

    // Do annotations!
    d3.selectAll('.annotation-group')
      .call(makeAnnotations);
  }

  // get annotations from API
  if (!isMobile.any()) {
    $.get('/api/glams/' + glamId + '/annotations', function(annotations_data) {
      if (annotations_data.length > 0) {
        annotations_data.forEach(note => {
          // calc views value
          let yVal = data[bisect(data, new Date(note.date))].views;
          // compose annotations
          let annotation_object = composeAnnotation({
            annotation: note.annotation,
            date: new Date(note.date),
            position: note.position,
            value: yVal
          });
          annotations.push(annotation_object);
        });
        doAnnotation(annotations);
      }
    });
  }

  // MOUSE HANDLER
  // $(".zoom-area").mousemove(function(event) {
  $("#svg-graph").mousemove(function(event) {

    let mousePoint = {x: event.pageX, y: event.pageY };

    if (isInsideGraph(mousePoint)) {
      // MOVE VERTICAL LINE
      let mouseX = mousePoint.x - $(event.target).position().left;
      verticalLine.select('line').remove();
      verticalLine.append("line")
                  .attr("x1", mouseX).attr("x2", mouseX)
                  .attr("y1", 5).attr("y2", height - 5)
                  .style("stroke", "DarkViolet")
                  .style("stroke-width", 0.5);

      // DISPLAY DATA
      displayDetails(getValueForPositionXFromData(mouseX));
    } else {
      // HIDE LINES
      verticalLine.select('line').remove();
      detailsLabel.selectAll('text').remove();
      detailsLabel.selectAll('rect').remove();
    }
  });

  // add circles for annotation
  $("#svg-graph").on("click", function(event) {
    if (ANNOTATION_EDIT_MODE) {
      let mousePoint = {x: event.pageX, y: event.pageY };
      let xCoord = mousePoint.x - margin.left * 2 - 15;
      let yValue = data[bisect(data, getValueForPositionXFromData(xCoord))].views;
      let yCoord = y(yValue);
      let fT = new Date(getValueForPositionXFromData(xCoord));

      var circle_data = {
        x: xCoord,
        y: yCoord,
        yValue: yValue,
        time: fT
      };

      if (isInsideGraph(mousePoint) && !NOTE_OVER) {
        showAnnotationDialog(circle_data);
      }
    }
  });

  function showAnnotationDialog(circle_data) {
    // hide annotation edit menu
    $('#annotationButtons').css('opacity', 0);
    // temporaily
    disableChartInteractivity();

    $('#note-form-title').text('ADD NEW ANNOTATION');
    $('#annotation_dialog_form').fadeInFlex();
    d3.selectAll('.note-dot').remove();

    $('#annotation_dialog_form .cancel-button').off('click');
    $('#annotation_dialog_form .cancel-button').click(function() {
      restoreChart();
    });

    $('#annotation_dialog_form .confirm-button').off('click');
    $('#annotation_dialog_form .confirm-button').click(function() {
      if ($('#note-text').val() !== '') {
        $('#annotation_dialog_form .confirm-button').addClass('full-disabled');
        // Save in DB
        let text = $('#note-text').val();
        let pos = $('#note-pos').val();
        let date = moment(new Date(circle_data.time)).format('YYYY-MM-DD');

        $.ajax({
          type: 'POST',
          url: '/api/admin/glams/' + glamId + '/annotations/' + date,
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({
            annotation: text,
            position: pos
          }),
          success: function(data) {
            // Restore chart
            restoreChart();
            // Compose object
            let annotation_object = composeAnnotation({
              annotation: text,
              position: pos,
              date: circle_data.time,
              value: circle_data.yValue
            });
            // Update list and redraw annotations
            annotations.push(annotation_object);
            doAnnotation(annotations);
          },
          error: function(err) {
            alert("Something went wrong");
            // Restore
            restoreChart();
          }
        });
      } else {
        alert('Cannot add annotation with empty text');
      }
    });

    // Show temporary marker
    focus.append("circle")
         .datum(circle_data)
         .attr('fill', 'var(--accent-green)')
         .attr('fill-opacity', 0.1)
         .attr('stroke', 'var(--accent-green)')
         .attr('stroke-width', 2)
         .attr('stroke-dasharray', 4)
         .attr("r", 14)
         .attr("class", "note-dot")
         .attr("cx", (d) => d.x)
         .attr("cy", (d) => d.y)
         .style("transition", "all .5s");
  }

  function composeAnnotation(options) {
    let pos = {};

    switch (options.position) {
      case 'right':
        pos.dx = 100;
        pos.dy = -20;
        break;
      case 'left':
        pos.dx = -100;
        pos.dy = 20;
        break;
      case 'top':
        pos.dx = -20;
        pos.dy = -100;
        break;
      case 'bottom':
        pos.dx = 20;
        pos.dy = 100;
        break;
    }

    let ann_obj = {
          id: moment(options.date).format('YYYY-MM-DD') + '_' + options.value,
          note: {
            label: options.annotation,
            position: options.position,
            title: moment(options.date).format('ll')
          },
          // can use x, y directly instead of data
          data: { date: options.date, close: options.value },
          dx: pos.dx,
          dy: pos.dy,
          subject: {
            radius: 10,
            radiusPadding: 5
          }
        };

    return ann_obj;
  }

  // *** FUNCTIONS ***
  // display data in text box
  function displayDetails(time) {
    // remove previous
    detailsLabel.selectAll('text').remove();
    detailsLabel.selectAll('rect').remove();
    // format date
    var formatDate = function (time, groupby) {
      if (groupby == 'week') {
        const from_date = moment(time).utc(true).startOf('isoWeek').isoWeekday(1);
        const to_date = moment(time).utc(true).endOf('isoWeek').isoWeekday(7);
        return from_date.format("D") + "-" + to_date.format("D MMM YYYY");
      }
      var format = {
        'day': "ddd D MMM YYYY",
        'month': "MMM YYYY",
        'quarter': "[Q]Q YYYY",
        'year': "YYYY"
      };
      return moment(time).utc(true).format(format[groupby]);
    };
    let fT = formatDate(time, $('#groupby-select').val());
    let views = data[bisect(data, time)].views;
    // show data (time)
    const text1 = detailsLabel.append("text")
                .attr("x", width-200)
                .attr("y", 20)
                .attr("class", "info-label")
                .html("DATE: " + fT)
                .attr("font-family", "monospace")
                .attr("font-size", "14px");

    // show data (views)
    const text2 = detailsLabel.append("text")
                .attr("x", width-200)
                .attr("y", 40)
                .attr("class", "info-label")
                .html("TOTAL VIEWS: " + nFormatter(views))
                .attr("font-family", "monospace")
                .attr("font-size", "14px");


    detailsLabel.insert("rect", "text")
                .attr('class', 'bounding-rect')
                .attr("x", text1.node().getBBox().x)
                .attr("y", text1.node().getBBox().y)
                .attr("width", text1.node().getBBox().width)
                .attr("height", text1.node().getBBox().height)
                .style("fill", "#fff");

    detailsLabel.insert("rect", "text")
                .attr('class', 'bounding-rect')
                .attr("x", text2.node().getBBox().x)
                .attr("y", text2.node().getBBox().y)
                .attr("width", text2.node().getBBox().width)
                .attr("height", text2.node().getBBox().height)
                .style("fill", "#fff");

    if (SHOWN_SEC_LINE) {
      let img_views = img_data[image_bisect(img_data, time)].sum;
      // show data (views)
      let text3 = detailsLabel.append("text")
                  .attr("x", width-200)
                  .attr("y", 60)
                  .attr("class", "info-label")
                  .html("FILE VIEWS: " + nFormatter(img_views))
                  .attr("font-family", "monospace")
                  .attr("font-size", "14px");
      detailsLabel.insert("rect", "text")
                  .attr('class', 'bounding-rect')
                  .attr("x", text3.node().getBBox().x)
                  .attr("y", text3.node().getBBox().y)
                  .attr("width", text2.node().getBBox().width)
                  .attr("height", text2.node().getBBox().height)
                  .style("fill", "#fff");
    }

  }

  // invert x values
  function getValueForPositionXFromData(xPosition) {
    var xValue = x.invert(xPosition);
    return xValue;
  }

  // check if point is inside graph
  function isInsideGraph(point) {
    const graphPosition = $('#svg-graph').position();
    const graphX = graphPosition.left;
    const graphY = graphPosition.top;
    const graphWidth = $('#svg-graph').width();
    const graphHeight = $('#svg-graph').height();
    return point.x > graphX 
          && point.x < graphX + graphWidth 
          && point.y > graphY 
          && point.y < graphY + graphHeight;
  }

  // zoom behavior handler
  function zoomFunction() {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush

    var t = d3.event.transform;

    x.domain(t.rescaleX(x2).domain());

    lineChart.select(".line").attr("d", valueline);

    if (SHOWN_SEC_LINE) {
      image_path.attr("d", image_valueline);
    }

    gX.call(xAxis);

    brushView.call(brush.move, x.range().map(t.invertX, t));

    if (makeAnnotations) makeAnnotations.updatedAccessors();
  }

  // brush behavior handler
  function brushFunction() {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom

    const s = d3.event.selection || x2.range();

    x.domain(s.map(x2.invert, x2));

    path.attr("d", valueline);
    if (SHOWN_SEC_LINE) {
      image_path.attr("d", image_valueline);
    }

    gX.call(xAxis);

    svg.select(".zoom-area")
       .call(zoom.transform, d3.zoomIdentity
       .scale(width / (s[1] - s[0]))
       .translate(-s[0], 0));

    if (makeAnnotations) makeAnnotations.updatedAccessors();
  }


  window.hideFileLine = function() {
    d3.selectAll('.image_line').remove();
    // update domain
    y.domain([minY,maxY]).rangeRound([height,0]).clamp(true);

    // update axis
    gY.call(yAxis);

    // update main line chart
    path.transition().attr("d", valueline);
    SHOWN_SEC_LINE = false;

    // Update annotations
    if (makeAnnotations) makeAnnotations.updatedAccessors();
  };

  window.showFileLine = function(filename) {
    d3.selectAll('.image_line').remove();
     if (filename !== undefined) {
       d3.json(FILE_QUERY + filename + queryParsed.search, function(error, image_data) {
         if (error) throw error;

         fixDataViz(image_data, 'access_date').forEach(function(d) {
           d.access_date = parseTime(d.access_date);
           d.sum = +d.sum;
         });

         SHOWN_SEC_LINE = true;
         img_data = image_data;

         // update domain
         let min = Math.min(d3.min(image_data, function(d) { return d.sum; }), minY);
         let max = Math.max(d3.max(image_data, function(d) { return d.sum; }), maxY);

         y.domain([min, max]).rangeRound([height,0]).clamp(true);
         // update axis
         gY.call(yAxis);

         // update main line chart
         path.transition().attr("d", valueline);

         // append new line
         image_valueline = d3.line()
                           .x(function(d) { return x(d.access_date); })
                           .y(function(d) { return y(d.sum); })
                           .curve(d3.curveStepAfter);

         image_path = lineChart.append("path")
                       .datum(image_data)
                       .attr("class", "image_line")
                       .attr("d", image_valueline);


         // Update annotations
         if (makeAnnotations) makeAnnotations.updatedAccessors();
       });
     }


  };
}

$.fn.fadeInFlex = function(time) {
  $(this).css('display', 'flex').hide().fadeIn(time);
  return this;
};
