module.exports = function(app){
    var SliderFW = Object.getPrototypeOf(app).SliderFW = new app.Component("sliderFW");
    // SliderFW.debug = true;
    SliderFW.createdAt      = "2.0.0";
    SliderFW.lastUpdate     = "2.5.1";
    SliderFW.version        = "2.0.0";
    // SliderFW.factoryExclude = true;
    SliderFW.loadingMsg     = "Dev version";
    // SliderFW.requires       = [];

    SliderFW.prototype.onCreate = function(){
        let slider = this;
        slider.el = slider.$el.get(0);
        slider.wrapper = slider.$el.find('.sliderFW__rail').length ? slider.$el.find('.sliderFW__rail') : $('<div class="sliderFW__wrapper"></div>');
        slider.moving = false;
        slider.queue = [];
        slider.current = 0;
        slider.direction = 'next';
        
        slider.keypress = slider.getData('keypress',true);
        slider.loop     = slider.getData('loop',true);
        slider.auto     = slider.getData('auto',false);
        slider.delay    = parseInt(slider.getData('delay',4000));
        slider.mode     = slider.getData('mode','slider');
        slider.step     = parseInt(slider.getData('step',1));
        
        slider.transition          = slider.getData('transition','translate');
        slider.transitionDuration  = slider.getData('duration',getComputedStyle(slider.el).getPropertyValue('--transition-duration'));
        slider.transitionFunction  = slider.getData('function',getComputedStyle(slider.el).getPropertyValue('--transition-function'));
        slider.itemsPerRow         = parseInt(slider.getData('nbitems',getComputedStyle(slider.el).getPropertyValue('--items-per-row')));
        slider.itemsGap            = slider.getData('gap',getComputedStyle(slider.el).getPropertyValue('--items-gap')); 
        slider.itemsImgOpacity     = slider.getData('img-opacity',getComputedStyle(slider.el).getPropertyValue('--items-img-opacity')); 
        slider.itemsOverlayColor   = slider.getData('overlay-color',getComputedStyle(slider.el).getPropertyValue('--items-overlay-color')); 
        slider.itemsOverlayOpacity = slider.getData('overlay-opacity',getComputedStyle(slider.el).getPropertyValue('--items-overlay-opacity')); 
        slider.items               = slider.$el.find('.sliderFW__item');
        slider.itemsMinWidth       = parseInt(slider.getData('itemsminwidth',0));
        
        // set properties for carrousel mode 
        if (slider.mode == "carrousel") {
            slider.loop = true;
            slider.delay = 0;
            slider.auto = true;
            slider.transition = 'translate';
            slider.transitionFunction = 'linear';
        }

        // set forced properties for each transitions
        if (slider.transition == 'fade') {
            slider.itemsPerRow = 1;
            slider.step = 1;
        }
        if (slider.transition == 'none') {
            slider.transitionDuration = 1;
            slider.transitionFunction = 'linear';
        }

        // set items
        if (slider.itemsPerRow < 1) 
            slider.itemsPerRow = 1;
        if (slider.itemsPerRow > slider.items.length) 
            slider.itemsPerRow = slider.items.length;
        if (slider.step > slider.itemsPerRow)
            slider.step = slider.itemsPerRow;
        if (slider.mode == "carrousel") 
            slider.step = slider.items.length;
        
        // set wrapper
        slider.$el.append(slider.wrapper);
        slider.el.setAttribute('data-transition',slider.transition);
        slider.wrapper.append(slider.items);

        // set loop things
        if (slider.loop && slider.transition != 'fade') {
            slider.itemsFirst = slider.items.slice(0,slider.itemsPerRow);
            for(var item of slider.itemsFirst.toArray()){
                let itemClone = item.cloneNode(true);
                itemClone.classList.add('dupe','firsts');
                slider.wrapper.append(itemClone);
            }
            slider.itemsLast = slider.items.slice(slider.items.length - slider.itemsPerRow);
            for(var item of slider.itemsLast.toArray().reverse()){
                let itemClone = item.cloneNode(true);
                itemClone.classList.add('dupe','lasts');
                slider.wrapper.prepend(itemClone);
            }
            slider.current = slider.itemsPerRow;
        }

        // manage animated state 
        slider.setTransitions(slider.transition);
        
        // set css custom properties
        slider.el.style.setProperty('--transition-duration', parseInt(slider.transitionDuration)+'ms');
        slider.el.style.setProperty('--transition-function', slider.transitionFunction);
        slider.el.style.setProperty('--items-per-row', slider.itemsPerRow);
        slider.el.style.setProperty('--items-gap', slider.itemsGap);
        slider.el.style.setProperty('--items-img-opacity', slider.itemsImgOpacity);
        slider.el.style.setProperty('--items-overlay-color', slider.itemsOverlayColor);
        slider.el.style.setProperty('--items-overlay-opacity', slider.itemsOverlayOpacity);
        slider.el.style.setProperty('--item-active', slider.current);

        // set auto trigger
        if(slider.auto){
            slider.timerAuto;
            slider.autoTrigger();
        }

        // set user action events
        if (slider.keypress)
            $(document).on('keyup',e=>{ slider.keyEvent(e);});


        slider.el.classList.add('loaded');
        console.log(slider);
        return slider;
    }

    SliderFW.prototype.autoTrigger = function() {
        var slider = this;
        slider.log('autoTrigger') 
        slider.timerAuto = setTimeout(function(){
            slider[slider.direction]();
        },slider.delay);
        return slider;
    };

    SliderFW.prototype.prev = function(){
        let slider = this;
        if (!slider.moving) {
            slider.direction = 'prev';

            let target;
            // translate, none
            target = (slider.current - slider.step >= 0 ? slider.current - slider.step : 0);
            
            if(slider.transition == 'fade'){
                target = (slider.current - slider.step >= 0 ? slider.current - slider.step : (slider.loop ? target = slider.items.length-1 : 0));
            }
            
            console.log('Prev, targeting:',target);
            slider.moveTo(target)
        } else {
            slider.log('queue prev');
            slider.queue.push('prev');
        }
        return slider; 
    }
    SliderFW.prototype.next = function(){
        let slider = this;
        if (!slider.moving) {
            slider.direction = 'next';
            
            let target;
            // translate, none
            if(slider.loop)
                target = slider.current + slider.step <= slider.items.length + slider.itemsPerRow ? slider.current + slider.step : slider.items.length + slider.itemsPerRow;
            else
                target = slider.items.length - (slider.current + slider.step) >= slider.itemsPerRow ? slider.current + slider.step : slider.current;

            if(slider.transition == 'fade'){
                if(slider.loop)
                    target = slider.current + slider.step < slider.items.length ? slider.current + slider.step : 0;
                else
                    target = slider.current + slider.step < slider.items.length ? slider.current + slider.step : slider.current;
            }
            
            console.log('Next, targeting:',target);
            slider.moveTo(target)
        } else {
            slider.log('queue next');
            slider.queue.push('next');
        }
        return slider; 
    }
    SliderFW.prototype.moveTo = function(index = 0){
        let slider = this;
        if (index != slider.current) {
            console.log('Currently on:', slider.current,'Transition start to:', index);
            slider.current = index;
            slider.moving = true;
            slider.el.classList.add('moving');
            slider.el.style.setProperty('--item-active', slider.current);

            if (slider.transition == 'fade') {
                slider.items.removeClass('active');
                slider.items.eq(index).addClass('active');
            }
        } else {
            console.log('Already on:',slider.current, 'Not moving');
        }
        return slider;
    }


    SliderFW.prototype.setTransitions = function(transition = this.transition){
        let slider = this;
        switch(transition) {
            case 'none':
            case 'translate':
                slider.wrapper.on('transitionend', function(e){
                    if (e.originalEvent.propertyName == 'translate') {
                        slider.moving = false;
                        slider.el.classList.remove('moving');
                        console.log('End of transition. Currently on:', slider.current);
                        var shiftPosition = function(){
                            return new Promise(function(resolve,reject){
                                if (slider.current == 0) {
                                    slider.current = slider.itemsPerRow + (slider.items.length - slider.itemsLast.length);
                                    slider.el.style.setProperty('--item-active', slider.current);
                                    console.log('hiting back of the track, go to ', slider.current);
                                }
                                else if (slider.current == slider.items.length+slider.itemsPerRow) {
                                    slider.current = slider.itemsPerRow;
                                    slider.el.style.setProperty('--item-active', slider.current);
                                    console.log('hiting end of the track, go to ', slider.current);
                                }
                                setTimeout(function(){
                                    resolve();
                                })
                            });
                        }
                        var doBefore = (slider.loop == true) ? shiftPosition() : Promise.resolve();
                        doBefore.then(e=>{
                            if (slider.queue.length){
                                slider[slider.queue.shift()]();
                            } else if(slider.auto){
                                clearTimeout(slider.timerAuto);
                                slider.autoTrigger();
                            } 
                        })
                    }
                });
            break;
            case 'fade':
                slider.items.eq(slider.current).addClass('active');
                slider.items.on('transitionend', function(e){
                    if (this.classList.contains('sliderFW__item') && this.classList.contains('active') && e.originalEvent.propertyName == 'opacity') {
                       slider.moving = false;
                       slider.el.classList.remove('moving');
                       console.log('End of transition. Currently on:', slider.current);

                       if (slider.queue.length){
                           slider[slider.queue.shift()]();
                       } else if(slider.auto){
                           clearTimeout(slider.timerAuto);
                           slider.autoTrigger();
                       } 
                    }
                });
            break;
        }
        return slider;
    }



    SliderFW.prototype.onResize = function(){
        let slider = this;
        return slider;
    }

    SliderFW.prototype.keyEvent = function(event){
        switch(event.which){
            case 37: // left
                this.prev(); break;
            case 39: // right
                this.next(); break;
            case 38: // up
            case 40: // down
            default: return; // exit this handler for other keys
        }
        event.preventDefault();
    };
    return SliderFW;
}


