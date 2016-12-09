/*
 *  Ost Popover plugin  - v0.0.1
 *  A lightWeight popover plugin with jquery
 *  https://github.com/pvoznyuk/jquery.ost-popover/
 *
 *  Made by Pavlo Vozniuk
 *  Under MIT License
 */

;(function ( $, window, document, undefined ) {

    // Create the defaults once
    var pluginName = 'ostPopover';
    var pluginClass = 'ost-popover';
    var pluginType = 'ost.popover';
    var user_options = {};
    var	defaults = {
        repositionEventHandlers: 'resize scroll orientationchange',
        repositionEvent: null,
        placement:'auto',
        width:'auto',
        height:'auto',
        trigger:'click',
        style:'',
        delay: {
            show: null,
            hide: null
        },
        async: {
            before: null, //function(that, xhr){}
            success: null //function(that, xhr){}
        },
        cache:true,
        multi:false,
        stacking:true, // 'true' allows popovers inside opened ones; 'false' replaces content of parent popover by child's one
        arrow:true,
        extraClass:'',
        title:'',
        content:'',
        selector:'',
        closeable:false,
        padding:true,
        url:'',
        type:'html',
        constrains:null,
        animation:null,
        template:'<div class="ost-popover">'+
        '<div class="arrow"></div>'+
        '<div class="ost-popover-inner">'+
        '<a href="#" class="close"></a>'+
        '<h3 class="ost-popover-title"></h3>'+
        '<div class="ost-popover-content"></div>'+
        '</div>'+
        '</div>'
    };

    var _globalIdSeed = 0;


    // The actual plugin constructor
    function OstPopover ( element, options ) {
        this.$element = $(element);
        try {
            if($.type(options.delay) === 'string' || $.type(options.delay) === 'number') {
                options.delay = {show:options.delay,hide:options.delay}; // bc break fix
            }
        } catch(e) {}
        this.user_options = options;
        this.options = $.extend( {}, defaults, options );
        this._defaults = defaults;
        this._name = pluginName;
        this._targetclick = false;
        this.init();
    }

    OstPopover.prototype = {
        //init ost popover
        init: function () {
            //init the event handlers
            if (this.getTrigger()==='click'){
                this.$element.off('click').on('click',$.proxy(this.toggle,this));
            }else{
                this.$element.off('mouseenter mouseleave click touchstart')
                    .on('mouseenter',$.proxy(this.mouseenterHandler,this))
                    .on('mouseleave',$.proxy(this.mouseleaveHandler,this))
                    .on('click touchstart',function(e){e.stopPropagation();});
            }
            this._poped = false;
            this._inited = true;
            this._idSeed = _globalIdSeed;
            _globalIdSeed++;
        },
        /* api methods and actions */
        destroy:function(){
            this.hide();
            this.$element.data('plugin_'+pluginName,null);
            if (this.getTrigger()==='click'){
                this.$element.off('click');
            }else{
                this.$element.off('mouseenter mouseleave');
            }
            if (this.$target){
                this.$target.remove();
            }
        },
        hide:function(event){
            if (event){
                event.preventDefault();
                event.stopPropagation();
            }
            if (this.xhr){
                this.xhr.abort();
                this.xhr = null;
            }

            var e = $.Event('hide.' + pluginType);
            this.$element.trigger(e);
            if (this.$target){this.$target.removeClass('in').hide();}
            this.$element.trigger('hidden.'+pluginType);
        },
        toggle:function(e){
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            this[this.getTarget().hasClass('in') ? 'hide' : 'show']();
        },
        hideAll:function(){
            $('div.ost-popover').not('.ost-popover-fixed').removeClass('in').hide();
            $('.active-popover').removeClass('active-popover');
        },
        /*core method ,show popover */
        show:function(){
            var
                $target = this.getTarget().removeClass().addClass(pluginClass);
            if (!this.options.multi){
                this.hideAll();
            }
            // use cache by default, if not cache setted  , reInit the contents
            if (!this.getCache()||!this._poped){
                this.content = '';
                this.setTitle(this.getTitle());
                if (!this.options.closeable){
                    $target.find('.close, .closePopover').off('click').remove();
                }
                if (!this.isAsync()){
                    this.setContent(this.getContent(),this.getSelector());
                }else{
                    this.setContentASync(this.options.content);
                    this.displayContent();
                    return;
                }
                $target.show();
            }
            this.displayContent();
            this.bindBodyEvents();
        },
        rePosition:function(){
            var
                //screen sizes
                clientHeight = $(window).height(),
                //element postion
                elementPos = this.getElementPosition(),
                //target postion
                $target = this.getTarget().removeClass().addClass(pluginClass),
                //target Width
                targetWidth = $target[0].offsetWidth,
                //target Height
                targetHeight = $target[0].offsetHeight,
                //placement
                placement = 'bottom';
            if (this.options.width!=='auto') {$target.width(this.options.width);}
            if (this.options.height!=='auto'){$targetContent.height(this.options.height);}
            targetWidth = $target[0].offsetWidth;
            targetHeight = $target[0].offsetHeight;

            placement = this.getPlacement(elementPos);

            var postionInfo = this.getTargetPositin(elementPos,placement,targetWidth,targetHeight);

            // checking if popover is positioned completely inside the screen
            var newTargetHeight = null;
            var newPopoverContentHeight = null;
            var $popoverInner = this.$target.find('.ost-popover-inner');
            var $popoverContent =  $popoverInner.find('.popover-content');
            var gap = 20;

            $popoverInner.css('max-height', '99999px').css('overflow','visible');
            if($popoverContent.length) {
                $popoverInner.css('max-height', '99999px').css('overflow','visible');
            }

            if( postionInfo.position.top < gap ) {
                newTargetHeight = targetHeight + postionInfo.position.top - gap;
                postionInfo.position.top = gap;
                if($popoverContent.length) {
                    newPopoverContentHeight = newTargetHeight - 12; // TODO: if arrow
                    $popoverContent.siblings().each(function(){
                        newPopoverContentHeight -= $(this).outerHeight();
                    });
                    $popoverContent
                        .css('max-height', newPopoverContentHeight + 'px')
                        .css('overflow', 'auto');
                } else {
                    $popoverInner
                        .css('max-height', newTargetHeight + 'px')
                        .css('overflow', 'auto');
                }
            } else if ( postionInfo.position.top + targetHeight > clientHeight - gap ) {
                newTargetHeight = clientHeight - postionInfo.position.top  - gap;

                if($popoverContent.length){
                    newPopoverContentHeight = newTargetHeight - 12;
                    $popoverContent.siblings().each(function(){
                        newPopoverContentHeight -= $(this).outerHeight();
                    });
                    $popoverContent
                        .css('max-height', newPopoverContentHeight + 'px')
                        .css('overflow','auto');
                } else {
                    $popoverInner
                        .css('max-height', newTargetHeight + 'px')
                        .css('overflow','auto');
                }
            }

            this.$target.css(postionInfo.position).addClass(placement).addClass('in').addClass(this.options.extraClass);

            this.$element.trigger('positioned.'+pluginType, $target);
        },
        displayContent:function(){

            var
                that = this,
            //element postion
                elementPos = this.getElementPosition(),
            //target postion
                $target = this.getTarget().removeClass().addClass(pluginClass),
            //target content
                $targetContent = this.getContentElement(),
            //target Width
                targetWidth = $target[0].offsetWidth,
            //target Height
                targetHeight = $target[0].offsetHeight,
            //placement
                placement = 'bottom',
                e = $.Event('show.' + pluginType);
            //if (this.hasContent()){
            this.$element.trigger(e);
            //}

            placement = this.getPlacement(elementPos);

            //init the popover and insert into the document body
            if (!this.options.arrow){
                $target.find('.arrow').remove();
            }
            $target.remove().css({ top: -1000, left: -1000, display: 'block' });
            if (this.getAnimation()){
                $target.addClass(this.getAnimation());
            }
            $target.appendTo(document.body);

            this.initTargetEvents();

            this.rePosition();

            targetWidth = $target[0].offsetWidth;
            targetHeight = $target[0].offsetHeight;

            var postionInfo = this.getTargetPositin(elementPos,placement,targetWidth,targetHeight);

            if (this.options.type==='iframe'){
                var $iframe = $target.find('iframe');
                $iframe.width($target.width()).height($iframe.parent().height());
            }

            if (this.options.style){
                this.$target.addClass(pluginClass+'-'+this.options.style);
            }

            if (!this.options.padding){
                //$targetContent.css('height',$targetContent.outerHeight());
                //this.$target.addClass('ost-no-padding');
            }
            if (!this.options.arrow){
                this.$target.css({'margin':0});
            }

            if (this.options.arrow){
                var $arrow = this.$target.find('.arrow');
                $arrow.removeAttr('style');
                if (postionInfo.arrowOffset){
                    $arrow.css(postionInfo.arrowOffset);
                }
            }
            this._poped = true;
            this.$element.trigger('shown.'+pluginType, $target);

            // Check stacking
            var $popoveredElements = $target.find(".has-popover, [href^='#'], [data-selector^='#']");
            if( $popoveredElements.length ) {
                if( this.options.stacking == true ) {
                    // show stacked popovers inside opened one
                    var new_options = this.options = $.extend({}, this.user_options, { multi:true } );
                    $popoveredElements.ostPopover(new_options);
                } else {
                    // replace current popover's content by new popover's content
                    $popoveredElements.on('click', function(x){
                        var $this = $(this);
                        var _selector = $this.attr('data-selector');

                        if( !_selector ) {
                            _selector = $this.attr('href');
                            $this.attr('data-selector', _selector);
                        }

                        if(_selector){
                            $selector = $( _selector );
                            if( $selector.length && $selector.is('.popover') ) {
                                var $targetContainer = $target.find('.ost-popover-content');
                                $targetContainer.html('');
                                $selector.children().clone(true,true).appendTo($targetContainer);
                                that.rePosition();
                                return false;
                            }
                        }
                    });
                }
            }

        },

        isTargetLoaded:function(){
            return  this.getTarget().find('i.glyphicon-refresh').length===0;
        },

        /*getter setters */
        getTriggerElement:function(){
            return this.$element;
        },
        getTarget:function(){
            if (!this.$target){
                var id = pluginName+this._idSeed;
                this.$target = $(this.options.template)
                    .attr('id',id)
                    .data('trigger-element',this.getTriggerElement());
                //this.$target.addClass( this.options.extraClass );
                this.$target.find('.ost-popover-content').closest('.ost-popover').addClass( this.options.extraClass );
                this.getTriggerElement().attr('data-target',id);
            }
            return this.$target;
        },
        getTitleElement:function(){
            return this.getTarget().find('.'+pluginClass+'-title');
        },
        getContentElement:function(){
            return this.getTarget().find('.'+pluginClass+'-content');
        },
        getTitle:function(){
            if ( this.options.title === '' ) {
                return '';
            } else {
                return this.$element.attr('data-title')||this.options.title||this.$element.attr('title');
            }
        },
        getUrl:function(){
            return this.$element.attr('data-url')||this.options.url;
        },
        getCache:function(){
            var dataAttr = this.$element.attr('data-cache');
            if (typeof(dataAttr) !== 'undefined') {
                switch(dataAttr.toLowerCase()){
                    case 'true': case 'yes': case '1': return true;
                    case 'false': case 'no': case '0': return false;
                }
            }
            return this.options.cache;
        },
        getTrigger:function(){
            return this.$element.attr('data-trigger')||this.options.trigger;
        },
        getDelayShow:function(){
            var dataAttr = this.$element.attr('data-delay-show');
            if (typeof(dataAttr) !== 'undefined') {
                return dataAttr;
            }
            return this.options.delay.show||100;
        },
        getHideDelay:function(){
            var dataAttr = this.$element.attr('data-delay-hide');
            if (typeof(dataAttr) !== 'undefined') {
                return dataAttr;
            }
            return this.options.delay.hide||100;
        },
        getConstrains:function(){
            var dataAttr = this.$element.attr('data-contrains');
            if (typeof(dataAttr) !== 'undefined') {
                return dataAttr;
            }
            return this.options.constrains;
        },
        getAnimation:function(){
            var dataAttr = this.$element.attr('data-animation');
            return dataAttr||this.options.animation;
        },
        setTitle:function(title){
            var $titleEl = this.getTitleElement();
            if (title){
                $titleEl.html(title);
            }else{
                $titleEl.remove();
            }
        },
        hasContent:function () {
            return this.getContent();
        },
        getSelector:function(){
            var selector = '';
            if ($.isFunction(this.options.selector)){
                selector = this.options.selector.apply(this.$element[0],arguments);
            }else{
                selector = this.options.selector;
            }
            this.selector = this.$element.attr('data-selector') || selector;
            if( !this.selector ){
                var _href = this.$element.attr('href');
                if( _href && _href[0] == '#' && $(_href).is('.popover') ){
                    this.$element.attr('data-selector', _href);
                    this.selector = _href;
                }
            }
            return this.selector;
        },
        getContent:function(){
            if (this.getUrl()){
                if (this.options.type==='iframe'){
                    this.content = $('<iframe frameborder="0"></iframe>').attr('src',this.getUrl());
                }
            }else if (!this.content){
                var content='';
                if ($.isFunction(this.options.content)){
                    content = this.options.content.apply(this.$element[0],arguments);
                }else{
                    content = this.options.content;
                }
                this.content = this.$element.attr('data-content') || content;
            }
            return this.content;
        },
        setContent:function(content,selector){
            var $target = this.getTarget();
            if(selector){
                $(selector).children().clone(true,true).appendTo( this.getContentElement());
            } else {
                this.getContentElement().html(content);
            }
            this.$target = $target;
        },
        isAsync:function(){
            return this.options.type==='async';
        },
        setContentASync:function(content){
            var that = this;
            this.xhr = $.ajax({
                url:this.getUrl(),
                type:'GET',
                cache:this.getCache(),
                beforeSend:function(xhr) {
                    if (that.options.async.before){
                        that.options.async.before(that, xhr);
                    }
                },
                success:function(data){
                    that.bindBodyEvents();
                    if (content&&$.isFunction(content)){
                        that.content = content.apply(that.$element[0],[data]);
                    }else{
                        that.content = data;
                    }
                    that.setContent(that.content);
                    var $targetContent = that.getContentElement();
                    $targetContent.removeAttr('style');
                    that.displayContent();
                    if (that.options.async.success){
                        that.options.async.success(that, data);
                    }
                    this.xhr = null;
                }
            });
        },

        bindBodyEvents:function(){
            $('body').off('keyup.ost-popover').on('keyup.ost-popover',$.proxy(this.escapeHandler,this));
            $('body').off('click.ost-popover').on('click.ost-popover',$.proxy(this.bodyClickHandler,this));
            $('body').off('touchstart.ost-popover').on('touchstart.ost-popover',$.proxy(this.bodyClickHandler,this));
        },

        /* event handlers */
        mouseenterHandler:function(){
            var self = this;
            if (self._timeout){clearTimeout(self._timeout);}
            self._enterTimeout = setTimeout(function(){
                if (!self.getTarget().is(':visible')){self.show();}
            },this.getDelayShow());
        },
        mouseleaveHandler:function(){
            var self = this;
            clearTimeout(self._enterTimeout);
            //key point, set the _timeout  then use clearTimeout when mouse leave
            self._timeout = setTimeout(function(){
                self.hide();
            },this.getHideDelay());
        },
        escapeHandler:function(e){
            if (e.keyCode===27){
                this.hideAll();
            }
        },
        bodyClickHandler:function(){
            if (this._targetclick){
                this._targetclick = false;
            }else{
                this.hideAll();
            }
        },

        targetClickHandler:function(){
            this._targetclick = true;
        },

        //reset and init the target events;
        initTargetEvents:function(){
            var that = this;
            if (this.getTrigger()!=='click'){
                this.$target.off('mouseenter mouseleave')
                    .on('mouseenter',$.proxy(this.mouseenterHandler,this))
                    .on('mouseleave',$.proxy(this.mouseleaveHandler,this));
            }
            this.$target.find('.close, .closePopover').off('click').on('click', $.proxy(this.hide,this));
            $(window).off('resize.ost orientationchange.ost').on('resize.ost orientationchange.ost',function(){
                try {
                    that.$target.hide();
                } catch(e) {
                    console.log(e);
                }
            });
            this.$target.off('click.ost-popover').on('click.ost-popover',$.proxy(this.targetClickHandler,this));
            this.$target.off('touchstart.ost-popover').on('touchstart.ost-popover',$.proxy(this.targetClickHandler,this));

            // Reposition popover if its content is changed

            this.$target.off("DOMNodeInserted DOMNodeRemoved").on("DOMNodeInserted DOMNodeRemoved", function(){
                that.rePosition();
                setTimeout(function(){
                    that.rePosition()
                },0);
            });

        },
        /* utils methods */
        //caculate placement of the popover
        getPlacement:function(pos){
            var
                placement,
                de = document.documentElement,
                db = document.body,
                clientWidth = de.clientWidth,
                clientHeight = de.clientHeight,
                scrollTop = Math.max(db.scrollTop,de.scrollTop),
                scrollLeft = Math.max(db.scrollLeft,de.scrollLeft),
                pageX = Math.max(0,pos.left - scrollLeft),
                pageY = Math.max(0,pos.top - scrollTop);
            //arrowSize = 20;

            //if placement equals auto，caculate the placement by element information;
            if (typeof(this.options.placement)==='function'){
                placement = this.options.placement.call(this, this.getTarget()[0], this.$element[0]);
            }else{
                placement = this.$element.data('placement')||this.options.placement;
            }

            if (placement==='auto'){
                var constrainsH = this.getConstrains() === 'horizontal',
                    constrainsV = this.getConstrains() === 'vertical';
                if (pageX<clientWidth/3){
                    if (pageY<clientHeight/3){
                        placement = constrainsH?'right-bottom':'bottom-right';
                    }else if (pageY<clientHeight*2/3){
                        if (constrainsV){
                            placement = pageY<=clientHeight/2?'bottom-right':'top-right';
                        }else{
                            placement = 'right';
                        }
                    }else{
                        placement =constrainsH?'right-top':'top-right';
                    }
                    //placement= pageY>targetHeight+arrowSize?'top-right':'bottom-right';
                }else if (pageX<clientWidth*2/3){
                    if (pageY<clientHeight/3){
                        if (constrainsH){
                            placement =pageX<=clientWidth/2?'right-bottom':'left-bottom';
                        }else{
                            placement ='bottom';
                        }
                    }else if (pageY<clientHeight*2/3){
                        if (constrainsH){
                            placement = pageX<=clientWidth/2?'right':'left';
                        }else{
                            placement = pageY<=clientHeight/2?'bottom':'top';
                        }
                    }else{
                        if (constrainsH){
                            placement =pageX<=clientWidth/2?'right-top':'left-top';
                        }else{
                            placement ='top';
                        }
                    }
                }else{
                    //placement = pageY>targetHeight+arrowSize?'top-left':'bottom-left';
                    if (pageY<clientHeight/3){
                        placement = constrainsH?'left-bottom':'bottom-left';
                    }else if (pageY<clientHeight*2/3){
                        if (constrainsV){
                            placement = pageY<=clientHeight/2?'bottom-left':'top-left';
                        }else{
                            placement = 'left';
                        }
                    }else{
                        placement = constrainsH?'left-top':'top-left';
                    }
                }
            }
            return placement;
        },

        getElementPosition:function(){
            return $.extend({},this.$element.offset(), {
                width: this.$element[0].offsetWidth,
                height: this.$element[0].offsetHeight
            });
        },

        getTargetPositin:function(elementPos,placement,targetWidth,targetHeight){
            var pos = elementPos,
                elementW = this.$element.outerWidth(),
                elementH = this.$element.outerHeight(),
                position={},
                arrowOffset=null,
                arrowSize = this.options.arrow?20:0,
                fixedW = elementW<arrowSize+10?arrowSize:0,
                fixedH = elementH<arrowSize+10?arrowSize:0;
            switch (placement) {
                case 'bottom':
                    position = {top: pos.top + pos.height, left: pos.left + pos.width / 2 - targetWidth / 2};
                    break;
                case 'top':
                    position = {top: pos.top - targetHeight, left: pos.left + pos.width / 2 - targetWidth / 2};
                    break;
                case 'left':
                    position = {top: pos.top + pos.height / 2 - targetHeight / 2, left: pos.left - targetWidth};
                    break;
                case 'right':
                    position = {top: pos.top + pos.height / 2 - targetHeight / 2, left: pos.left + pos.width};
                    break;
                case 'top-right':
                    position = {top: pos.top - targetHeight, left: pos.left-fixedW};
                    arrowOffset = {left: Math.min(elementW,targetWidth)/2 + fixedW};
                    break;
                case 'top-left':
                    position = {top: pos.top - targetHeight, left: pos.left -targetWidth +pos.width + fixedW};
                    arrowOffset = {left: targetWidth - Math.min(elementW,targetWidth) /2 -fixedW};
                    break;
                case 'bottom-right':
                    position = {top: pos.top + pos.height, left: pos.left-fixedW};
                    arrowOffset = {left: Math.min(elementW,targetWidth) /2+fixedW};
                    break;
                case 'bottom-left':
                    position = {top: pos.top + pos.height, left: pos.left -targetWidth +pos.width+fixedW};
                    arrowOffset = {left: targetWidth- Math.min(elementW,targetWidth) /2 - fixedW};
                    break;
                case 'right-top':
                    position = {top: pos.top -targetHeight + pos.height + fixedH, left: pos.left + pos.width};
                    arrowOffset = {top: targetHeight - Math.min(elementH,targetHeight)/2 -fixedH};
                    break;
                case 'right-bottom':
                    position = {top: pos.top - fixedH, left: pos.left + pos.width};
                    arrowOffset = {top: Math.min(elementH,targetHeight) /2 +fixedH };
                    break;
                case 'left-top':
                    position = {top: pos.top -targetHeight + pos.height+fixedH, left: pos.left - targetWidth};
                    arrowOffset = {top: targetHeight - Math.min(elementH,targetHeight)/2 - fixedH};
                    break;
                case 'left-bottom':
                    position = {top: pos.top -fixedH , left: pos.left -targetWidth};
                    arrowOffset = {top: Math.min(elementH,targetHeight) /2 + fixedH };
                    break;

            }

            return {position:position,arrowOffset:arrowOffset};
        }
    };
    $.fn[ pluginName ] = function ( options, cb ) {
        return this.each(function() {
            var ostPopover = $.data( this, 'plugin_' + pluginName );
            if (!ostPopover) {
                if (!options){
                    ostPopover = new OstPopover( this, null);
                }else if (typeof options ==='string'){
                    if (options!=='destroy'){
                        ostPopover = new OstPopover( this, null );
                        ostPopover[options]();
                    }
                }else if (typeof options ==='object'){
                    ostPopover = new OstPopover( this, options );
                }
                $.data( this, 'plugin_' + pluginName, ostPopover);
            }else{
                if (options==='destroy'){
                    ostPopover.destroy();
                }else if (typeof options ==='string'){
                    ostPopover[options]();
                }
            }
            if(cb && typeof cb == 'function') cb(ostPopover)
        });
    };

})( jQuery, window, document );

