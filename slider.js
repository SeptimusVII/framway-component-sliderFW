module.exports = function(){
    let Slider = Object.getPrototypeOf(fw).Slider = class Slider extends fw.Component{
        static {
            this.debug = true;
            this.createdAt  = "3.0.0";
            this.lastUpdate = "3.0.0";
            this.version = "1.0.0";
            this.tpl = utils.htmlToNode(require('bundle-tpl:./slider.html')).outerHTML;

            this.transitionStep       = 1;
            this.transitionDuration   = '500ms';
            this.transitionFunction   = 'ease';
            this.itemsPerRow          = 2;
            this.itemsGap             = '1em';

            // this.describe();
        }
        onCreate(){
            this.wrapper   = this.el.querySelector('.slider__wrapper') ?? utils.htmlToNode('<div class="slider__wrapper"></div>');
            this.items     = this.el.querySelectorAll('.slider__item');
            this.moving    = false;
            this.current   = 0;
            this.direction = 'next';
            this.queue     = [];

            this.keypress   = this.getData('keypress',true);
            this.loop       = this.getData('loop',true);
            this.auto       = this.getData('auto',false);
            this.delay      = parseInt(this.getData('delay',4000));
            this.mode       = this.getData('mode','slider');
            this.transition = this.getData('transition-type','translate');
            
            this.transitionDuration  = this.getData('transition-duration', Slider.transitionDuration);
            this.transitionFunction  = this.getData('transition-function', Slider.transitionFunction);
            this.transitionStep      = parseInt(this.getData('transition-step', Slider.transitionStep));
            this.itemsPerRow         = parseInt(this.getData('items-per-row', Slider.itemsPerRow));
            this.itemsGap            = this.getData('gap', Slider.itemsGap);
            this.itemsMinWidth       = parseInt(this.getData('itemsminwidth',this.getData('minsizeitem',0)));

            // set properties for carrousel mode 
            if (this.mode == "carrousel") {
                this.loop = true;
                this.delay = 0;
                this.auto = true;
                this.transition = 'translate';
                this.transitionFunction = 'linear';
            }

            // set forced properties for each transitions
            if (this.transition == 'fade') {
                this.itemsPerRow = 1;
                this.transitionStep = 1;
            }
            if (this.transition == 'none') {
                this.transitionDuration = '1ms';
                this.transitionFunction = 'linear';
            }

            // set items
            if (this.itemsPerRow < 1) 
                this.itemsPerRow = 1;
            if (this.itemsPerRow > this.items.length) 
                this.itemsPerRow = this.items.length;
            if (this.transitionStep > this.itemsPerRow)
                this.transitionStep = this.itemsPerRow;
            if (this.mode == "carrousel") 
                this.transitionStep = this.items.length;

            // set wrapper
            this.el.setAttribute('data-transition-type',this.transition);
            this.el.append(this.wrapper);
            this.items.forEach((el)=>{
                this.wrapper.append(el)
            })

            // set loop things
            if (this.loop && this.transition != 'fade') {
                this.itemsFirst = Array.from(this.items).slice(0,this.itemsPerRow);
                for(var item of this.itemsFirst){
                    let itemClone = item.cloneNode(true);
                    itemClone.classList.add('dupe','firsts');
                    this.wrapper.append(itemClone);
                }
                this.itemsLast = Array.from(this.items).slice(this.items.length - this.itemsPerRow);
                for(var item of this.itemsLast.reverse()){
                    let itemClone = item.cloneNode(true);
                    itemClone.classList.add('dupe','lasts');
                    this.wrapper.prepend(itemClone);
                }
                this.current = this.itemsPerRow;
            }

            // set css custom properties
            this.syncCssValue('--transition-duration',   'transitionDuration',  this.transitionDuration);
            this.syncCssValue('--transition-function',   'transitionFunction',  this.transitionFunction);
            this.syncCssValue('--transition-step',       'transitionStep',      this.transitionStep);
            this.syncCssValue('--items-per-row',         'itemsPerRow',         this.itemsPerRow);
            this.syncCssValue('--items-gap',             'itemsGap',            this.itemsGap);
            this.syncCssValue('--item-active',           'current',             this.current);

            // manage animated state 
            this.setTransitions();

            // set auto trigger
            if(this.auto){
                this.timerAuto;
                this.autoTrigger();
            }

            // set user action events
            if (this.keypress)
                document.addEventListener('keyup',e=>{ this.keyEvent(e);});


            if (Slider.observeCssChanges) {
                this.observer = new MutationObserver(function(mutations) {
                    mutations.forEach( function (mutation) {
                        console.log(mutation);
                    });
                });
                this.observer.observe(this.el, {attributes: true, childList: false, characterData: true, subtree:false, attributeFilter: ["style"], attributeOldValue : true});
            }
        }

        syncCssValue(cssVarName,objectVarName, value){
            this.setCssProperty(cssVarName, value);
            this[objectVarName] = value;
        }

        next(){
            if (!this.moving) {
                this.direction = 'next';
                let target = 0;
                // translate, none
                if(this.loop)
                    target = this.current + this.transitionStep <= this.items.length + this.itemsPerRow ? this.current + this.transitionStep : this.items.length + this.itemsPerRow;
                else
                    target = this.items.length - (this.current + this.transitionStep) >= this.itemsPerRow ? this.current + this.transitionStep : this.current;

                if(this.transition == 'fade'){
                    if(this.loop)
                        target = this.current + this.transitionStep < this.items.length ? this.current + this.transitionStep : 0;
                    else
                        target = this.current + this.transitionStep < this.items.length ? this.current + this.transitionStep : this.current;
                }
                this.log('Next, targeting: '+target);
                this.moveTo(target);
            }  else {
                this.log('queue next');
                this.queue.push('next');
            }
            return this; 
        }
        prev(){
            if (!this.moving) {
                this.direction = 'prev';

                let target;
                // translate, none
                target = (this.current - this.transitionStep >= 0 ? this.current - this.transitionStep : 0);
                
                if(this.transition == 'fade'){
                    target = (this.current - this.transitionStep >= 0 ? this.current - this.transitionStep : (this.loop ? target = this.items.length-1 : 0));
                }
                
                this.log('Prev, targeting: '+target);
                this.moveTo(target)
            } else {
                this.log('queue prev');
                this.queue.push('prev');
            }
            return this; 
        }

        moveTo(index=0){
            if (index != this.current) {
                this.log('moveTo','Currently on: '+ this.current+'\nTransition start to: '+ index);
                this.moving = true;
                this.el.classList.add('moving');
                this.syncCssValue('--item-active', 'current', index);

                if (this.transition == 'fade') {
                    for(var item of this.items)
                        item.classList.remove('active');
                    this.items[index].classList.add('active');
                }
            } else {
                this.log('moveTo - Already on: '+ this.current, 'Not moving');
            }
            return this;
        }

        setTransitions(){
            let slider = this;
            switch(this.transition) {
                case 'none':
                case 'translate':
                    this.wrapper.addEventListener('transitionend', function(e){
                        if (e.propertyName == 'translate') {
                            slider.moving = false;
                            slider.el.classList.remove('moving');
                            slider.log('End of transition. Currently on: '+ slider.current);
                            var shiftPosition = function(){ 
                                // fails when changing the number of items per row, need rework
                                return new Promise(function(resolve,reject){
                                    if (slider.current == 0) {
                                        slider.syncCssValue('--item-active', 'current', slider.itemsPerRow + (slider.items.length - slider.itemsLast.length));
                                        slider.log('hiting back of the track, go to ' + slider.current);
                                    }
                                    else if (slider.current == slider.items.length+slider.itemsPerRow) {
                                        slider.syncCssValue('--item-active', 'current', slider.itemsPerRow);
                                        slider.log('hiting end of the track, go to ' + slider.current);
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
                    slider.items[slider.current].classList.add('active');
                    for(let item of this.items){
                        item.addEventListener('transitionend', function(e){
                            if (item.classList.contains('slider__item') && item.classList.contains('active')  && e.propertyName == 'opacity') {
                               slider.moving = false;
                               slider.el.classList.remove('moving');
                               slider.log('End of transition. Currently on: '+ slider.current);

                               if (slider.queue.length){
                                   slider[slider.queue.shift()]();
                               } else if(slider.auto){
                                   clearTimeout(slider.timerAuto);
                                   slider.autoTrigger();
                               } 
                            }
                        });
                    }
                break;
            }
            return this;
        }

        autoTrigger() {
            var slider = this;
            slider.log('autoTrigger') 
            slider.timerAuto = setTimeout(function(){
                slider[slider.direction]();
            },slider.delay);
            return slider;
        };


        keyEvent(event){
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
    }
    return Slider;
}