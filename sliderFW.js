require('hammerjs'); // importing hammer.js
module.exports = function(app){
    var SliderFW = Object.getPrototypeOf(app).SliderFW = new app.Component("sliderFW");
    // SliderFW.debug = true;
    SliderFW.createdAt      = "2.0.0";
    SliderFW.lastUpdate     = "2.0.0";
    SliderFW.version        = "1";
    // SliderFW.factoryExclude = true;
    // SliderFW.loadingMsg     = "This message will display in the console when component will be loaded.";
    // SliderFW.requires       = [];

    SliderFW.prototype.onCreate = function(){
        var slider = this;
        slider.content    = {$el : slider.$el.find('.sliderFW__container'),};
        slider.$rail      = slider.content.$el.find('.sliderFW__rail');
        slider.arrows     = slider.getData('arrows',false);
        slider.loop       = slider.getData('loop',false);
        slider.swipe      = slider.getData('swipe',true);
        slider.keypress   = slider.getData('keypress',false);
        slider.auto       = slider.getData('auto',false);
        slider.transition = slider.getData('transition','translate'); 
        slider.duration   = slider.getData('duration',false); 
        slider.delay      = slider.getData('delay',5600); 
        slider.nbItems    = slider.getData('nbitems',1); 
        slider.timerAuto;

        // set items
        slider.content.items = slider.content.$el.find('.sliderFW__item');
        if (slider.nbItems < 1) slider.nbItems = 1;
        if (slider.nbItems > 1) slider.setItemsPerRows(slider.nbItems);
        
        // manage navigation
        slider.$nav = $('<div class="sliderFW__nav"></div>').appendTo(slider.$el);
        slider.content.items.each(function(){
            $('<span class="sliderFW__nav__item"></span>').appendTo(slider.$nav);
        });
        slider.$nav.children().first().addClass('active');
        slider.$nav.children().bind('click',function(e){
            slider.$nav.children().removeClass('active');
            var index = $(this).addClass('active').index();
            $(slider.content.items.removeClass('active').get(index)).addClass('active');
            slider.transitionStart();
        });
        
        // transitions
        slider.transitionStart = function(){ if(SliderFW.debug) slider.log('transition started') };
        slider.transitionEnd   = function(){ if(SliderFW.debug) slider.log('transition ended') };
        slider.setTransitions();

        // manage arrows
        if(slider.arrows && slider.content.items.length > 1){
            slider.content.$el.append('<div class="sliderFW__arrow prev"></div><div class="sliderFW__arrow next"></div>');
            slider.$el.find('.sliderFW__arrow').bind('click',function(e){
                if($(this).hasClass('prev'))
                    slider.goToPrev();
                if($(this).hasClass('next'))
                    slider.goToNext();
            });
        }

        if(slider.auto) 
            slider.autoTrigger();
        if (slider.keypress)
            $(document).on('keyup',function(event){ slider.keyEvent(event); });

        if (slider.duration)
            slider.$rail.css('transition','transform '+slider.duration+'ms');

        slider.onResize();
    }

    SliderFW.prototype.setItemsPerRows = function(nbItems){
        var slider = this;
        var totalItems  = slider.content.items.length;
        var nbRows      = Math.ceil(totalItems / nbItems);
        var $subitems   = slider.content.items.toggleClass('sliderFW__item sliderFW__subitem').remove();
        slider.$rail.addClass('multiple');

        var i = 0;
        for (var r = 0; r < nbRows; r++) {
            var $item = $('<div class="sliderFW__item"></div>');
            for (var c = 0; c < nbItems; c++) {
                if (i < totalItems)
                    $item.append($subitems.get(i));
                else
                    $item.append('<div class="sliderFW__subitem empty"></div>')
                i++;
            }
            slider.$rail.append($item);
        }
        slider.content.items = slider.content.$el.find('.sliderFW__item');

        if (SliderFW.debug) {
            // console.log('-------------------');
            // console.log('nbItems : '+ nbItems);
            // console.log('nbRows : '+ nbRows);
            // console.log('slider nb items : '+slider.content.items.length);
            // console.log('subitems width : '+slider.$el.find('.sliderFW__item__content').first().outerWidth());
            // console.log('$subitems : ', $subitems);
        }

        slider.nbItems = nbItems;
        if (slider.$el.find('.sliderFW__item__content').first().outerWidth() < 300 && nbItems > 0){
            slider.$el.find('.sliderFW__subitem.empty').remove()
            slider.$el.find('.sliderFW__subitem').unwrap('.sliderFW__item').toggleClass('sliderFW__item sliderFW__subitem');
            slider.content.items = slider.content.$el.find('.sliderFW__item');
            if (nbItems > 1){
                slider.nbItems--;
                slider.setItemsPerRows(nbItems-1);
            }
        }
        if (slider.nbItems<=1) slider.$rail.removeClass('multiple')
        return this;
    }

    SliderFW.prototype.onResize = function(){
        var slider = this;
        slider.$nav.find('.sliderFW__nav__item.active').trigger('click');
        slider.setHeight();
    }

    SliderFW.prototype.setHeight = function() {
        var slider = this;
        var heightBox = 0;
        if(slider.$el.data('height') && slider.$el.data('height') != ""){
            heightBox = slider.$el.data('height');
        }
        else{
            slider.$el.find('.sliderFW__item__content').css('height','auto');
            slider.content.items.each(function(index,item){
                if($(item).find('.sliderFW__item__content').get(0).scrollHeight + (!slider.$el.hasClass('nav--hidden')?slider.$nav.height():0) > heightBox){
                    heightBox = $(item).find('.sliderFW__item__content').get(0).scrollHeight + (!slider.$el.hasClass('nav--hidden')?slider.$nav.height():0);
                }
            });
            slider.$el.find('.sliderFW__item__content').css('height','100%');
        }
        if(this.$el.data('height') == "viewport"){
            heightBox = utils.getViewportHeight();
        }
        slider.content.$el.height(heightBox);
        return this;
    };

    SliderFW.prototype.setTransitions = function(transition = this.transition){
        var slider = this;

        if(slider.swipe){
            var swipeSlide = new Hammer(slider.$el.get(0));
            swipeSlide.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL });

            var swipeEvents = function(event){
                switch(event.type){
                    case 'swipeleft':
                    slider.goToNext(); break;
                    case 'swiperight':
                    slider.goToPrev(); break;
                    default: break;
                }
            };
            swipeSlide.on('swipeleft swiperight', swipeEvents);
        }

        switch(transition){
            case 'translate':
                slider.transitionStart = function(){
                    if(SliderFW.debug) slider.log('transition started - '+transition)
                    if(slider.loop && slider.swipe)
                        swipeSlide.off('swipeleft swiperight', swipeEvents);
                        slider.$rail.css('transform', 'translate3d('+ (-slider.content.items.filter('.active').get(0).offsetLeft + (slider.content.$el.outerWidth() - slider.content.items.filter('.active').outerWidth())/2) +'px,0,0)');
                };
                slider.transitionEnd = function(){
                    if(SliderFW.debug) slider.log('transition ended - '+transition)
                        slider.$rail.css('transform', 'translate3d('+ (-slider.content.items.filter('.active').get(0).offsetLeft + (slider.content.$el.outerWidth() - slider.content.items.filter('.active').outerWidth())/2) +'px,0,0)');
                    if(slider.loop && slider.swipe)
                        swipeSlide.on('swipeleft swiperight', swipeEvents);
                    if(slider.auto){
                        clearTimeout(slider.timerAuto);
                        slider.autoTrigger();
                    }
                };
                if(slider.loop){
                    slider.$rail.on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function(e){
                        if (e.target === slider.$rail.get(0)){
                            slider.railSwap().then(function(){
                                slider.transitionEnd();
                            })
                        }
                    });
                    slider.$nav.children().first().trigger('click');
                } else {
                    slider.$rail.on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function(e){
                        if (e.target === slider.$rail.get(0)) {
                            slider.transitionEnd();
                        }
                    });
                }
            break;
            case 'fade':
            case 'none':
                slider.transitionStart = function(){ 
                    if(SliderFW.debug) slider.log('transition started - '+transition);
                    if (transition == 'none') slider.transitionEnd();
                };
                slider.transitionEnd   = function(){ 
                    if(SliderFW.debug) slider.log('transition ended - '+transition);
                    if(slider.auto){
                        clearTimeout(slider.timerAuto);
                        slider.autoTrigger();
                    } 
                };

                slider.$rail.on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function(e){
                    if (e.target.className.includes('sliderFW__item') && e.target.className.includes('active')) {
                        slider.transitionEnd();
                    }
                });
                break;
            default: break;
        }
    };

    SliderFW.prototype.railSwap = function(){
        var slider = this;
        return new Promise(function(resolve,reject){
            if (slider.content.items.length > 2) {
                if(SliderFW.debug) slider.log('swapping rail items');
                slider.$rail.addClass('no-transition');
                if(slider.content.items.filter('.active').next().length == 0)
                    slider.$rail.find('.sliderFW__item').first().appendTo(slider.$rail);
                else if(slider.content.items.filter('.active').prev().length == 0)
                    slider.$rail.find('.sliderFW__item').last().prependTo(slider.$rail);
                setTimeout(function(){
                    slider.$rail.removeClass('no-transition');
                }, 1);
            }
            resolve();
        });
    }

    SliderFW.prototype.autoTrigger = function() {
        var slider = this;
        if(SliderFW.debug) slider.log('autoTrigger') 
        slider.timerAuto = setTimeout(function(){
            slider.goToNext()
        },slider.delay);
    };

    SliderFW.prototype.goToNext = function() {
        var slider = this;
        if(slider.loop && slider.content.items.length > 2){
            if(slider.$nav.find('.sliderFW__nav__item.active').next('.sliderFW__nav__item').length)
                slider.$nav.find('.sliderFW__nav__item.active').next('.sliderFW__nav__item').trigger('click');
            else
                slider.$nav.find('.sliderFW__nav__item').first().trigger('click');
        } else{
            slider.$nav.find('.sliderFW__nav__item.active').next('.sliderFW__nav__item').trigger('click');
        }
    };
    SliderFW.prototype.goToPrev = function() {
        var slider = this;
        if(slider.loop && slider.content.items.length > 2){
            if(slider.$nav.find('.sliderFW__nav__item.active').prev('.sliderFW__nav__item').length)
                slider.$nav.find('.sliderFW__nav__item.active').prev('.sliderFW__nav__item').trigger('click');
            else
                slider.$nav.find('.sliderFW__nav__item').last().trigger('click');
        } else{
            slider.$nav.find('.sliderFW__nav__item.active').prev('.sliderFW__nav__item').trigger('click');
        }
    };

    SliderFW.prototype.keyEvent = function(event){
        switch(event.which){
            case 37: // left
                this.goToPrev(); break;
            case 39: // right
                this.goToNext(); break;
            case 38: // up
            case 40: // down
            default: return; // exit this handler for other keys
        }
        event.preventDefault();
    };

    return SliderFW;
}


