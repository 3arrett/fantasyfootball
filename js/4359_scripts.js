(function($){
//Wrap columns of layout container so we can have 100% width with centered content
	$('.layoutContainer').wrapInner('<div class="lcContainer"/>');
	$('.hero .column1').unwrap();
//Allow for dynamic changing of background in layout containers	
	$('.layoutContainer').each(function(){
		var getSrc = $(this).find('.bkgImg img').attr("src");
		var background = "url('" + getSrc + "') no-repeat center center";
		var exist = $(this).find('.bkgImg').length;
		var height = $(this).outerHeight() + 175;
		if (exist == 1 && !$('html').hasClass('lte8')) {
		$(this).css('background', background );
		}
		if(exist == 1 && $('html').hasClass('lte8')) {
			$(this).prepend('<div class="ieBkg" style="height:' + height + ';"><img src="' + getSrc + '" alt="background image"></div>');
		}
		$('.bkgImg').hide();
	});
//Move the image in the Featured Text Block to be the first child in the DOM to change stacking order
	$('.dbh .leftTextImage').each(function(){var p = $j(this).parent(); $j(this).detach().prependTo(p); });
//Allow for multiple column styles in one layout container
    	var lc;
    	$('.yieldPageContent').children().each(function() {
    	    var $this = $(this);
    	    if ($this.hasClass('append') && lc) {
    	        $this.detach();
    	        lc.append($this);
    	    } else {
    	        lc = $this;
        	}
    	});
//Allow for red section to have multiple column styles
	var pEl;
    	$('.column').children().each(function() {
    	    var $this = $(this);
    	    if ($this.hasClass('sub') && pEl) {
    	        $this.detach();
    	        pEl.append($this);
    	    } else {
    	        pEl = $this;
        	}
    	});
    	
//Div for positioning the DBH Span
	$('#displayBodyHeader span').wrap('<div class="dbhWrap"/>');
// Add class to footer legal information
	$('#siteFooter ul:has("#poweredByNGIN")').addClass('legal');
//Fix Text in footer
 	$('#siteFooter ul.legal li:first a').text('Sport Ngin');
//Build the amazing site header
	$('.logoContainer').insertBefore('#displayBodyHeader .dbhWrap');
	$('#topNav').appendTo('.logoContainer');
	$('#displayBodyHeader').append('<div class="spacer"/>');
	$('#displayBodyHeader').children().each(function() {
		$(this).addClass('row');
	});
	$('.logoContainer, .dbhWrap').wrapInner('<div class="wrapper"/>');
	$('#productsTray').insertBefore('.dbhWrap').removeClass('row');

    //arrange the background image starting position for all the rows.
    //This will allow the background image cut illusion when showing the folder content panel
    var background = $('#displayBodyHeader').css('background-image');
    $('.row').each(function() {
        $(this).css({ backgroundImage: background });
    });
//Homepage
	$('#homepage .dbhWrap .wrapper span').replaceWith('');
	$('#homepage .titleList li:nth-child(3)').addClass('on');
	$('#homepage .pageHeader > .lcContainer').wrap('<div class="back"/>');
	$('.noEntry').text('No articles currently found');
	$('.homeSlide .contentTabs').wrap('<div class="wrap"/>');
	// For each image of the feed
	$('.newsPreviewThumb').each(function() {													
		var src = $j(this).attr('src');
		// Find and replace the _thumb. so we have a large image to work with
	    $(this).attr('src', src.replace(/_thumb\.(png|jpg|jpeg|gif)$/, '.$1'));				
	});
	$('.newsItemElement h2').prependTo($('.newsItemElement'));
	$('.newsTags').insertAfter($('.newsAuthor'));
	$('.subNav h4').text('Categories');
	$('.subNav ul.children li a').each(function() {
		var text = $(this).text();
		$(this).text('+ ' + text);
	});
	if(!$('.layoutContainer').hasClass('first')) {
		$('.spacer').addClass('notop');
	}
	if($('body').hasClass('newsPage')) {
		var title = $('.newsPage .subNav .parents #page_node_515776 a').text();
		$('.spacer').removeClass('notop');
		$('#displayBodyHeader .dbhWrap .wrapper span').text(title);
	}
//Change text on blog pages
	$('#blogNews .dbhWrap .wrapper span').text('Blog').append('<span class="second">/News</span>');
	$('#blogLinks .dbhWrap .wrapper span').text('Blog').append('<span class="second">/Links</span>');
	$('#blogArticles .dbhWrap .wrapper span').text('Blog').append('<span class="second">/Articles</span>');
	
//Smooth Scrolling to the pricing section
	if ( $('#designSetup').length ) {
		$('.annual').click(function(event) {
  			event.preventDefault();
  			var $target = $('#annual').offset().top;
  			$('body,html').animate({scrollTop: ($target - 40)}, 500);
  		});
  		$('.designsetup').click(function(event) {
  			event.preventDefault();
  			var $target = $('#designsetup').offset().top;
  			$('body,html').animate({scrollTop: ($target - 40)}, 500);
  		});
  		$('.optional').click(function(event) {
  			event.preventDefault();
  			var $target = $('#optional').offset().top;
  			$('body,html').animate({scrollTop: ($target - 40)}, 500);
  		});
  	}
//Showcase Page Isotope
	if($('#showcasePage').length == 1){
		
		// cache container
		var $showcaseContainer = $('.showcaseContainer');
		// initialize isotope
		$showcaseContainer.isotope({
  			itemSelector : '.showcase',
		});
		// filter items when filter link is clicked
		$('#showcaseFilters a').click(function(){
  			var selector = $(this).attr('data-filter'),
  				urlTag = $(this).text().toLowerCase().replace(/\s/g, "_");
  			$('#showcaseFilters').find('a.selected').removeClass('selected');
  			$(this).addClass('selected');
  			$showcaseContainer.isotope({ filter: selector });
  			window.location.hash = urlTag;
  			return false;
		});
	};
//Blog Links Aside
	var relatedArticles = $('.relatedArticlesAside');
	$('.hide .codeElement').hide();
	relatedArticles.detach().appendTo('.newsItemElement');
	var rAAheight = $('.relatedArticlesAside').height();
	if ( relatedArticles.length ) {
		$('.newsContentNode').css('margin-top', -121 + (0 - rAAheight));
	}
//Mobile Icons fade
	$('.mobileTray a').hover(
		function() {
			$(this).siblings().css('opacity', '0.25');
			$(this).css('opacity', '1');
		},
		function() {
			$(this).siblings().css('opacity', '1');
	});
	


})(jQuery);
//End DocumentReady

$j(document).delegate('body', 'topnav.loaded', function () {
(function($){
	$('#accountNav').wrap('<div class="accountNavContainer" />');
})(jQuery);
});
//END TOP NAV LOADED
