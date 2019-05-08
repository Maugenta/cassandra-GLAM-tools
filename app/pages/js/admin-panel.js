$(function() {
  // Help
  $('#admin-help').mouseenter(function() {
    $('#glam-legend').stop().fadeIn(200);
  }).mouseleave(function() {
    $('#glam-legend').stop().fadeOut(200);
  });
  // Get data
  $.getJSON('/api/admin/glams', function(items) {
    if (items.length > 0) {
      $.get('/views/templates/glam-preview.tpl', function(tpl) {
        var template = Handlebars.compile(tpl);
        items.forEach(function(el, idx) {
          // create object
          let obj = {};
          obj.glamID = el.name;
          obj.glamFullName = el.fullname;
          obj.image_url = el.image;
          obj.glamCategory = el.category.replace("Category:", "");
          if (el.lastrun !== null) {
            obj.lastrun = moment(el.lastrun).format("MMM Do YY");
          }
          obj.status = el.status;
          switch (obj.status) {
            case "running":
            case "pending":
              obj.command = "pause";
              obj.paused = false;
              break;
            case "paused":
              obj.command = "restart";
              obj.paused = true;
              break;
            case "failed":
              obj.command = "retry";
              obj.paused = true;
              break;
          }
          if (isEven(idx)) {
            $('#glams-list-left').append(template(obj));
          } else {
            $('#glams-list-right').append(template(obj));
          }
        });
        // on hover
        $('.glam-block').mouseenter( function() {
          $(this).find('.glam-controls-overlay').fadeIn(200);
          $(this).find('.glam-controls').fadeIn(200);
        }).mouseleave( function() {
          $(this).find('.glam-controls-overlay').fadeOut(100);
          $(this).find('.glam-controls').fadeOut(100);
        });
        // on click pause/unpause
        $('.glam-block > .glam-controls.command').click(function() {
          let pause = !$(this).data('glampaused');
          $.ajax({
            type: "PUT",
            url:'/api/admin/glams/' + $(this).data('glamid'),
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({paused: pause}),
            success: function(data) {
              location.reload();
            },
            error: function(err) {
              alert('Something went wrong!');
              $(this).removeClass('disabled');
            }
          });
          $(this).addClass('disabled');
        });
      });
    } else {
      $('#glams-list').html('<div class="w-100 text-center my-5"><h1>No available GLAMs</h1></div>');
    }
  });
});

function isEven(number) {
  return number % 2 === 0;
}