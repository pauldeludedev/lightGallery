/**
 * Video module for lightGallery
 * Supports HTML5, YouTube, Vimeo, wistia videos
 *
 *
 * @ref Wistia
 * https://wistia.com/support/integrations/wordpress(How to get url)
 * https://wistia.com/support/developers/embed-options#using-embed-options
 * https://wistia.com/support/developers/player-api
 * https://wistia.com/support/developers/construct-an-embed-code
 * http://jsfiddle.net/xvnm7xLm/
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video
 *
 * @ref Youtube
 * https://developers.google.com/youtube/player_parameters#enablejsapi
 * https://developers.google.com/youtube/iframe_api_reference
 *
 */

import { VideoDefaults, videoDefaults } from './lg-video-settings';
import { LightGallery } from '../../lightgallery';
import { lgQuery } from '../../lgQuery';
import { CustomEventHasVideo } from '../../types';
declare let YT: any;
declare let Vimeo: any;
declare let videojs: any;

declare global {
    interface Window {
        _wq: any;
        Vimeo: any;
    }
}

declare global {
    interface Window {
        LG: (selector: any) => lgQuery;
    }
}

function param(obj: { [x: string]: string | number | boolean }): string {
    return Object.keys(obj)
        .map(function (k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]);
        })
        .join('&');
}

export class Video {
    private core: LightGallery;
    private s: VideoDefaults;
    constructor(instance: LightGallery) {
        this.core = instance;
        this.s = Object.assign({}, videoDefaults);

        this.init();

        return this;
    }
    init() {
        /**
         * Event triggered when video url found without poster
         * Append video HTML
         * Play if autoplayFirstVideo is true
         */
        this.core.LGel.on('hasVideo.lg.tm', this.onHasVideo.bind(this));

        // Set max width for video
        this.core.LGel.on(
            'onAferAppendSlide.lg.tm',
            this.onAferAppendSlide.bind(this),
        );

        console.log('calling video');
        if (
            this.core.doCss() &&
            this.core.galleryItems.length > 1 &&
            (this.core.s.enableSwipe || this.core.s.enableDrag)
        ) {
            this.core.LGel.on('onSlideClick.lg.tm', () => {
                console.log('calling');
                const $el = this.core.getSlideItem(this.core.index);
                this.loadVideoOnPosterClick($el);
            });
        } else {
            // For IE 9 and bellow
            this.core.outer
                .find('.lg-item')
                .first()
                .on('click.lg', () => {
                    const $el = this.core.getSlideItem(this.core.index);
                    this.loadVideoOnPosterClick($el);
                });
        }

        // @desc fired immediately before each slide transition.
        this.core.LGel.on('onBeforeSlide.lg.tm', this.onBeforeSlide.bind(this));

        // @desc fired immediately after each slide transition.
        this.core.LGel.on('onAfterSlide.lg.tm', this.onAfterSlide.bind(this));
    }

    /**
     * @desc Event triggered when video url or poster found
     * Append video HTML is poster is not given
     * Play if autoplayFirstVideo is true
     *
     * @param {Event} event - Javascript Event object.
     * @param {number} index - Current index of the slide
     * @param {string} src - src of the video
     * @param {string} html - HTML5 video
     */
    onHasVideo(event: CustomEventHasVideo): void {
        const { index, src, html5Video, hasPoster } = event.detail;
        if (!hasPoster) {
            // All functions are called separately if poster exist in loadVideoOnPosterClick function

            this.appendVideos(this.core.getSlideItem(index), {
                src,
                addClass: 'lg-object',
                index,
                html5Video,
            });

            // Automatically navigate to next slide once video reaches the end.
            this.gotoNextSlideOnVideoEnd(src, index);
        }

        if (this.s.autoplayFirstVideo && !this.core.lGalleryOn) {
            if (hasPoster) {
                const $slide = this.core.getSlideItem(index);
                this.loadVideoOnPosterClick($slide);
            } else {
                this.playVideo(index);
            }
        }
    }

    /**
     * @desc Fired when the slide content has been inserted into its slide container.
     * Set max width for video
     *
     * @param {Event} event - Javascript Event object.
     * @param {number} index - Current index of the slide
     */
    onAferAppendSlide(event: CustomEvent) {
        const $videoCont = this.core
            .getSlideItem(event.detail.index)
            .find('.lg-video-cont')
            .first();
        if (!$videoCont.hasClass('lg-has-iframe')) {
            $videoCont.css('max-width', this.s.videoMaxWidth);
        }
    }

    /**
     * @desc fired immediately before each slide transition.
     * Pause the previous video
     * Hide the download button if the slide contains YouTube, Vimeo, or Wistia videos.
     *
     * @param {Event} event - Javascript Event object.
     * @param {number} prevIndex - Previous index of the slide.
     * @param {number} index - Current index of the slide
     */
    onBeforeSlide(event: CustomEvent) {
        const { prevIndex, index } = event.detail;
        this.pauseVideo(prevIndex);

        const _videoInfo = this.core.galleryItems[index].__slideVideoInfo || {};
        if (_videoInfo.youtube || _videoInfo.vimeo || _videoInfo.wistia) {
            this.core.outer.addClass('lg-hide-download');
        }
    }

    /**
     * @desc fired immediately after each slide transition.
     * Play video if autoplayVideoOnSlide option is enabled.
     *
     * @param {Event} event - Javascript Event object.
     * @param {number} prevIndex - Previous index of the slide.
     * @param {number} index - Current index of the slide
     */
    onAfterSlide(event: CustomEvent) {
        const { prevIndex, index } = event.detail;
        if (this.s.autoplayVideoOnSlide && this.core.lGalleryOn) {
            this.core.getSlideItem(prevIndex).removeClass('lg-video-playing');
            setTimeout(() => {
                const $slide = this.core.getSlideItem(index);
                if (
                    $slide.find('.lg-object').first().hasClass('lg-has-poster')
                ) {
                    this.loadVideoOnPosterClick($slide);
                } else {
                    this.playVideo(index);
                }
            }, 100);
        }
    }

    /**
     * Play HTML5, Youtube, Vimeo or Wistia videos in a particular slide.
     * @param {number} index - Index of the slide
     */
    playVideo(index: number) {
        this.controlVideo(index, 'play');
    }

    /**
     * Pause HTML5, Youtube, Vimeo or Wistia videos in a particular slide.
     * @param {number} index - Index of the slide
     */
    pauseVideo(index: number) {
        this.controlVideo(index, 'pause');
    }

    getVideoHtml(
        src: any,
        addClass: any,
        index: number,
        html5Video: { source: string | any[]; [key: string]: any },
    ) {
        let video = '';
        const videoInfo =
            this.core.galleryItems[(index as unknown) as number]
                .__slideVideoInfo || {};
        const currentDynamicItem = this.core.galleryItems[index];
        let videoTitle = currentDynamicItem.title || currentDynamicItem.alt;
        videoTitle = videoTitle ? 'title="' + videoTitle + '"' : '';
        const commonIframeProps = `allowtransparency="true" 
            frameborder="0" 
            scrolling="no" 
            allowfullscreen 
            mozallowfullscreen 
            webkitallowfullscreen 
            oallowfullscreen 
            msallowfullscreen`;

        if (videoInfo.youtube) {
            const videoId = 'lg-youtube' + index;

            const youtubePlayerParams = `?wmode=opaque&autoplay=0&enablejsapi=1`;

            const playerParams =
                youtubePlayerParams + '&' + param(this.s.youtubePlayerParams);

            video = `<iframe allow="autoplay" id=${videoId} class="lg-video-object lg-youtube ${addClass}" ${videoTitle} src="//www.youtube.com/embed/${
                videoInfo.youtube[1] + playerParams
            }" ${commonIframeProps}></iframe>`;
        } else if (videoInfo.vimeo) {
            const videoId = 'lg-vimeo' + index;
            const playerParams = param(this.s.vimeoPlayerParams);

            video = `<iframe allow="autoplay" id=${videoId} class="lg-video-object lg-vimeo ${addClass}" ${videoTitle} src="//player.vimeo.com/video/${
                videoInfo.vimeo[1] + playerParams
            }" ${commonIframeProps}></iframe>`;
        } else if (videoInfo.wistia) {
            const wistiaId = 'lg-wistia' + index;
            const playerParams = param(this.s.wistiaPlayerParams);
            video = `<iframe allow="autoplay" id="${wistiaId}" src="//fast.wistia.net/embed/iframe/${
                videoInfo.wistia[4] + playerParams
            }" ${videoTitle} class="wistia_embed lg-video-object lg-wistia ${addClass}" name="wistia_embed" ${commonIframeProps}></iframe>`;
        } else if (videoInfo.html5) {
            let html5VideoMarkup = '';
            for (let i = 0; i < html5Video.source.length; i++) {
                html5VideoMarkup += `<source src="${html5Video.source[i].src}" type="${html5Video.source[i].type}">`;
            }

            let html5VideoAttrs = '';

            Object.keys(html5Video).forEach(function (key) {
                if (key !== 'source') {
                    html5VideoAttrs += `${key}="${html5Video[key]}" `;
                }
            });
            video = `<video class="lg-video-object lg-html5 ${
                this.s.videojs ? 'video-js' : ''
            }" ${html5VideoAttrs}>
                ${html5VideoMarkup}
                Your browser does not support HTML5 video.
            </video>`;
        }

        return video;
    }

    /**
     * @desc - Append videos to the slide
     *
     * @param {HTMLElement} el - slide element
     * @param {Object} videoParams - Video parameters, Contains src, class, index, htmlVideo
     */
    appendVideos(
        el: lgQuery,
        videoParams: { src: any; addClass: any; index: any; html5Video: any },
    ) {
        const videoHtml = this.getVideoHtml(
            videoParams.src,
            videoParams.addClass,
            videoParams.index,
            videoParams.html5Video,
        );
        el.find('.lg-video').append(videoHtml);
        const $videoElement = el.find('.lg-video-object').first();
        if (this.s.videojs) {
            try {
                videojs($videoElement.get(), this.s.videojsOptions);
            } catch (e) {
                console.error(
                    'lightGallery:- Make sure you have included videojs',
                );
            }
        }
        this.core.LGel.trigger('onAppendVideo.lg', [
            $videoElement,
            videoParams.index,
        ]);
    }

    gotoNextSlideOnVideoEnd(src: any, index: number) {
        const $videoElement = this.core
            .getSlideItem(index)
            .find('.lg-video-object')
            .first();
        const videoInfo = this.core.galleryItems[index].__slideVideoInfo || {};
        if (this.s.gotoNextSlideOnVideoEnd) {
            if (videoInfo.html5) {
                $videoElement.on('ended', () => {
                    this.core.goToNextSlide();
                });
            } else if (videoInfo.youtube) {
                try {
                    new YT.Player($videoElement.attr('id'), {
                        events: {
                            onStateChange: (event: { data: any }) => {
                                if (event.data === YT.PlayerState.ENDED) {
                                    this.core.goToNextSlide();
                                }
                            },
                        },
                    });
                } catch (e) {
                    console.error(
                        'lightGallery:- Make sure you have included //www.youtube.com/iframe_api',
                    );
                }
            } else if (videoInfo.vimeo) {
                try {
                    // https://github.com/vimeo/player.js/#ended
                    new Vimeo.Player($videoElement.get()).on('ended', () => {
                        this.core.goToNextSlide();
                    });
                } catch (e) {
                    console.error(
                        'lightGallery:- Make sure you have included //github.com/vimeo/player.js',
                    );
                }
            } else if (videoInfo.wistia) {
                try {
                    window._wq = window._wq || [];

                    // @todo Event is gettign triggered multiple times
                    window._wq.push({
                        id: $videoElement.attr('id'),
                        onReady: (video: {
                            bind: (arg0: string, arg1: () => void) => void;
                        }) => {
                            video.bind('end', () => {
                                this.core.goToNextSlide();
                            });
                        },
                    });
                } catch (e) {
                    console.error(
                        'lightGallery:- Make sure you have included //fast.wistia.com/assets/external/E-v1.js',
                    );
                }
            }
        }
    }

    controlVideo(index: number, action: string) {
        const $videoElement = this.core
            .getSlideItem(index)
            .find('.lg-video-object')
            .first();
        const videoInfo = this.core.galleryItems[index].__slideVideoInfo || {};

        if (!$videoElement.get()) return;

        if (videoInfo.youtube) {
            try {
                // @todo Do not create multiple player instences
                // Create and store in dynamic array
                new YT.Player($videoElement.attr('id'), {
                    events: {
                        onReady: function (event: any) {
                            event.target[`${action}Video`]();
                        },
                    },
                });
            } catch (e) {
                console.error(
                    'lightGallery:- Make sure you have included //www.youtube.com/iframe_api',
                );
            }
        } else if (videoInfo.vimeo) {
            try {
                new Vimeo.Player($videoElement.get())[action]();
            } catch (e) {
                console.error(
                    'lightGallery:- Make sure you have included //github.com/vimeo/player.js',
                );
            }
        } else if (videoInfo.html5) {
            if (this.s.videojs) {
                try {
                    (videojs($videoElement.get()) as any)[action as any]();
                } catch (e) {
                    console.error(
                        'lightGallery:- Make sure you have included videojs',
                    );
                }
            } else {
                ($videoElement.get() as any)[action]();
            }
        } else if (videoInfo.wistia) {
            try {
                window._wq = window._wq || [];

                // @todo Find a way to destroy wistia player instance
                window._wq.push({
                    id: $videoElement.attr('id'),
                    onReady: (video: any) => {
                        video[action]();
                    },
                });
            } catch (e) {
                console.error(
                    'lightGallery:- Make sure you have included //fast.wistia.com/assets/external/E-v1.js',
                );
            }
        }
    }

    loadVideoOnPosterClick($el: lgQuery) {
        // check slide has poster
        if (
            $el.find('.lg-object').first().hasClass('lg-has-poster') &&
            $el.find('.lg-object').first().style().display !== 'none'
        ) {
            // check already video element present
            if (!$el.hasClass('lg-has-video')) {
                $el.addClass('lg-video-playing lg-has-video');

                let _html;

                const _src = this.core.galleryItems[this.core.index].src;
                if (this.core.galleryItems[this.core.index].video) {
                    _html = JSON.parse(
                        this.core.galleryItems[this.core.index].video,
                    );
                }

                this.appendVideos($el, {
                    src: _src,
                    addClass: '',
                    index: this.core.index,
                    html5Video: _html,
                });

                this.gotoNextSlideOnVideoEnd(_src, this.core.index);
                this.playVideo(this.core.index);

                const $tempImg = $el.find('.lg-object').first().get();

                // @todo make sure it is working
                $el.find('.lg-video').first().append($tempImg);

                // @todo loading icon for html5 videos also
                // for showing the loading indicator while loading video
                if (
                    !$el.find('.lg-video-object').first().hasClass('lg-html5')
                ) {
                    $el.removeClass('lg-complete');
                    $el.find('.lg-video-object')
                        .first()
                        .on('load.lg error.lg', () => {
                            $el.addClass('lg-complete');
                        });
                }
            } else {
                this.playVideo(this.core.index);

                $el.addClass('lg-video-playing');
            }
        }
    }
}

window.lgModules.video = Video;
