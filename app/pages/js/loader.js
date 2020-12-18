// Load main sidebar
$('#main-sidebar').load('/views/templates/sidebar.hbs', function() {
  // Load secondary sidebar
  $('#secondary-sidebar').load('/views/templates/secondary-sidebar.hbs', function() {
    // Fill GLAMS list
    $.get('/api/glams', function(glams) {
      if (glams.length > 0) {
        glams.forEach(function(g) {
          // create list element with link
          var list_element = $('<li>');
          let a = $('<a>');
          // set attrs
          a.html(g['fullname']);
          a.attr('href', '/' + g['name']);
          a.attr('alt', g['category']);
          // append
          list_element.append(a);
          $('#secondary-sidebar > .institutions-list').append(list_element);
        });
      }
    });
    // Set mouse handler
    const direction = langDict.isRtl ? 'right' : 'left'
    $('.institutions-menu').mouseenter(function() {
      $('#secondary-sidebar').css(direction, 'var(--sidebar-width)');
      $(this).css('opacity', '.4');
    }).mouseleave(function() {
      if ($('#secondary-sidebar:hover').length === 0) {
        $('#secondary-sidebar').css(direction, '0');
        $('.institutions-menu').css('opacity', '1');
      }
    });
    // Set mouse handlers
    $('#secondary-sidebar').mouseleave(function() {
      if ($('.institutions-menu:hover').length === 0) {
        $(this).css(direction, '0');
        $('.institutions-menu').css('opacity', '1');
      }
    });
  });
});

// Load mobile header bar
$('#mobile-header-bar').load('/views/templates/mobile-header.hbs', function() {
  // attach event to burger menu
  $('.left.sidebar').first().sidebar('attach events', '#sidebar-toggler', 'show');
  //  no pointer events while menu is open (avoids to trigger click on logo)
  $('.left.sidebar').sidebar('setting', 'onShow', function() {
    $('#mobile-header-bar').addClass('no-pointer-events');
  });
  $('.left.sidebar').sidebar('setting', 'onHidden', function() {
    $('#mobile-header-bar').removeClass('no-pointer-events');
  });
});

// Load mobile sidebar
$('#mobile-sidebar').load('/views/templates/mobile-sidebar.hbs');


$(function() {
  $('.get-chart-info').click(function() {
    $(this).closest('.chart-preview-inner').css('transform', 'rotateY(180deg)');
  });
  $('.close-chart-info').click(function() {
    $(this).closest('.chart-preview-inner').css('transform', 'rotateY(0deg)');
  });
  $('.chart-preview-back').click(function() {
    $(this).closest('.chart-preview-inner').css('transform', 'rotateY(0deg)');
  });
});
