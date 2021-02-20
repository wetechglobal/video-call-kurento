$(function() {
  // HELPERS
  // Cache all files to check before converting
  var allFiles = {}
  var checkExists = function (filename) {
    if (!allFiles[filename]) {
      return false
    }
    swal('Success', filename + ' is already converted', 'success')
    return true
  }
  // Shortcut for ajax call
  var handleApiErr = function(err) {
    if (err && !err.readyState && !err.status) {
      swal('Pending', 'Your file is queued to process', 'success')
      return
    }
    var msg = (err && err.responseJSON && err.responseJSON.message)
      || 'An error occurred. Please try again.'
    swal('Error', msg, 'error')
  }
  var processFile = function (data, outFilename) {
    $.ajax({
      type: 'POST',
      url: '/api/process-file',
      contentType: 'application/json',
      data: JSON.stringify(data),
    }).then(function() {
      var type = typeof outFilename
      if (type === 'function') {
        outFilename()
        return
      }
      if (type !== 'string') {
        return
      }
      allFiles[outFilename] = true
      swal('Success', 'Convert ' + data.filename + ' successfully. Reload the browser to get the latest file list', 'success')
    }).catch(handleApiErr)
  }
  // Allow to view sub online
  var $subViewContainer = $(
    '<div class="sub-view-container">' +
      '<div class="sub-view-header clearfix">' +
        '<span class="sub-view-title"></span>' +
        '<div class="btn btn-sm btn-primary pull-right">Close</div>' +
        '<a href="" class="pull-right">' +
          '<div class="btn btn-sm btn-success">Download</div>' +
        '</a>' +
      '</div>' +
      '<div class="sub-view-content">' +
        '<pre></pre>' +
      '</div>' +
    '</div>'
  )
  var $subViewClose = $subViewContainer.find('.btn-primary')
  var $subViewTitle = $subViewContainer.find('.sub-view-title')
  var $subViewLink = $subViewContainer.find('a')
  var $subViewContent = $subViewContainer.find('.sub-view-content')
  var showView = function (link, content) {
    $subViewContainer.show()
    $subViewLink.attr('href', link)
    $subViewTitle.text(link.replace(/^.+\//, ''))
    $subViewContent.html(content)
  }
  var hideView = function() {
    showView('', '')
    $subViewContainer.hide()
  }
  $subViewClose.on('click', hideView)
  window.addEventListener('keydown', function(e) {
    if (e.keyCode === 27) {
      hideView()
    }
  })
  $('body').append($subViewContainer)


  // REFACTOR
  // Get directory name
  var path = window.location.pathname
  if (path && path.charAt(path.length - 1) !== '/') {
    path += '/'
  }
  var dir = path.replace('/files/', '')


  // MAIN PROCESS
  $('li').each(function() {
    // Get variables
    var $li = $(this)
    var $link = $li.find('a')
    var $name = $li.find('.name')
    var $size = $li.find('.size')
    var $date = $li.find('.date')

    // Handle the header row
    if ($li.hasClass('header')) {
      $date.text('Action')
      return
    }

    // Get the file name
    var originalFilename = $name.text()
    var link = path + originalFilename
    // Get the file extension
    var filenameArr = originalFilename.split('.')
    var ext = filenameArr.pop()
    var filenameWithoutExt = filenameArr.join('.')

    // Replace Modified tab with Action tab
    $date.html('')

    // Skip the rest if this row is a directory
    if (!filenameWithoutExt || originalFilename === '..') {
      return
    }

    // Handle icon
    $li.addClass(ext)
    // Handle the filename with dir
    var filename = dir + originalFilename
    filenameWithoutExt = dir + filenameWithoutExt
    // Cache all files to avoid duplicated file processing
    allFiles[filename] = true


    // Handle size to a human readable format
    if (filenameWithoutExt) {
      var sizeTxt = $size.text()
      sizeTxt = parseInt(sizeTxt)
      sizeTxt = window.filesize(sizeTxt)
        .human().replace('i', '')
      if (/Bytes$/.test(sizeTxt)) {
        sizeTxt = sizeTxt.replace(/\.\d+/, '')
      }
      $size.text(sizeTxt)
    }


    // Handle link click to preview files
    $link.on('click', function(e) {
      e.preventDefault()
      e.stopPropagation()
      if (ext === 'mp4') {
        showView(link,
          '<video controls>' +
            '<source src="'+link+'" type="video/mp4" />' +
          '</video>'
        )
      }
      else if (ext === 'flac') {
        showView(link,
          '<audio controls>' +
            '<source src="'+link+'" type="audio/flac" />' +
          '</audio>' +
          '<p class="text-center text-danger">' +
            '(Player for flac is only supported on chromium based browser)' +
          '</p>'
        )
      }
      else if (ext === 'txt') {
        showView(link,
          '<p class="text-center text-primary">' +
            'Loading ...' +
          '</p>'
        )
        $.get(link)
          .then(function(content) {
            showView(link,
              '<pre>' + content + '</pre>'
            )
          })
          .catch(function() {
            showView(link,
              '<p class="text-center text-danger">' +
                'Can not load the file to preview' +
              '</p>'
            )
          })
      }
      else {
        showView(link,
          '<p class="text-center text-danger">' +
            'This file is not supported to preview' +
          '</p>'
        )
      }
    })


    // Handle mp4 file
    if (ext === 'mp4') {
      // Sound btn to convert mp4 to flac
      var flacFilename = filenameWithoutExt + '.flac'
      var $flac = $('<button class="btn btn-sm btn-primary">Sound</button>')
      $flac.on('click', function(e) {
        e.preventDefault()
        e.stopPropagation()
        if (checkExists(flacFilename)) {
          return
        }
        processFile({
          filename: filename,
          action: 'mp4-flac',
        }, flacFilename)
      })
      $date.append($flac)
    }


    // Handle flac file
    if (ext === 'flac') {
      // Sub btn to transcribe flac to txt
      var txtFilename = filenameWithoutExt + '.txt'
      var $sub = $('<button class="btn btn-sm btn-warning">Sub</button>')
      $sub.on('click', function(e) {
        e.preventDefault()
        e.stopPropagation()
        if (checkExists(txtFilename)) {
          return
        }
        processFile({
          filename: filename,
          action: 'flac-txt',
        }, txtFilename)
      })
      $date.append($sub)
    }


    // Handle all file types
    var $del = $('<button class="btn btn-sm btn-danger">Del</button>')
    $del.on('click', function(e) {
      e.preventDefault()
      e.stopPropagation()
      swal({
        type: 'warning',
        title: 'Do you want to delete the file?',
        html: filename,
        showCancelButton: true,
        confirmButtonText: "Delete",
        confirmButtonColor: '#D9534F',
      }).then(function() {
        processFile({
          filename: filename,
          action: 'delete',
        }, function() {
          $li.remove()
          delete allFiles[filename]
        })
      }).catch(function() {})
    })
    $date.append($del)

    // ...
  })


  // Remove the hidden class after finish loading
  $('body').removeClass('hidden')
})
