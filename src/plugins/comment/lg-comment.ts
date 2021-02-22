/**
 * @desc lightGallery comments module
 * Supports facebook and disqus comments
 *
 * @ref - https://help.disqus.com/customer/portal/articles/472098-javascript-configuration-variables
 * @ref - https://github.com/disqus/DISQUS-API-Recipes/blob/master/snippets/js/disqus-reset/disqus_reset.html
 * @ref - https://css-tricks.com/lazy-loading-disqus-comments/
 *
 */

import { lGEvents } from '../../lg-events';
import { lgQuery } from '../../lgQuery';
import { LightGallery } from '../../lightgallery';
import { commentSettings, CommentSettings } from './lg-comment-settings';
declare let FB: any;
declare let DISQUS: any;

declare global {
    interface Window {
        $LG: (selector: any) => lgQuery;
    }
}

const $LG = window.$LG;
export class CommentBox {
    core: LightGallery;
    settings: CommentSettings;
    constructor(instance: LightGallery) {
        // get lightGallery core plugin data
        this.core = instance;
        // extend module default settings with lightGallery core settings
        this.settings = Object.assign({}, commentSettings, this.core.settings);

        if (this.settings.commentBox) {
            this.init();
        }

        return this;
    }

    init() {
        this.setMarkup();
        this.toggleCommentBox();
        if (this.settings.fbComments) {
            this.addFbComments();
        } else if (this.settings.disqusComments) {
            this.addDisqusComments();
        }
    }

    setMarkup() {
        this.core.outer
            .find('.lg')
            .append(
                this.settings.fbCommentsMarkup +
                    '<div id="lg-comment-overlay"></div>',
            );

        const commentToggleBtn =
            '<span id="lg-comment-toggle" class="lg-icon"></span>';
        this.core.outer.find('.lg-toolbar').append(commentToggleBtn);
    }

    toggleCommentBox() {
        $LG('#lg-comment-toggle').on('click.lg.comment', () => {
            this.core.outer.toggleClass('lg-comment-active');
        });

        $LG('#lg-comment-overlay').on('click.lg.comment', () => {
            this.core.outer.removeClass('lg-comment-active');
        });
        $LG('#lg-comment-close').on('click.lg.comment', () => {
            this.core.outer.removeClass('lg-comment-active');
        });
    }

    addFbComments() {
        this.core.LGel.on(`${lGEvents.beforeSlide}.comment`, (event) => {
            const { index } = event.detail;
            $LG('#lg-comment-body').html(
                $LG(this.core.items).eq(index).attr('data-fb-html'),
            );
        });
        this.core.LGel.on(`${lGEvents.afterSlide}.comment`, function () {
            try {
                FB.XFBML.parse();
            } catch (err) {
                $LG(window).on('fbAsyncInit', function () {
                    FB.XFBML.parse();
                });
            }
        });
    }

    addDisqusComments() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;
        const $disqusThread = $LG('#disqus_thread');
        $disqusThread.remove();
        $LG('#lg-comment-body').append('<div id="disqus_thread"></div>');

        this.core.LGel.on(`${lGEvents.beforeSlide}.comment`, () => {
            $disqusThread.html('');
        });

        this.core.LGel.on(`${lGEvents.afterSlide}.comment`, (event) => {
            const { index } = event.detail;
            // DISQUS needs sometime to intialize when lightGallery is opened from direct url(hash plugin).
            setTimeout(
                function () {
                    try {
                        DISQUS.reset({
                            reload: true,
                            config: function () {
                                this.page.identifier = $LG(_this.core.items)
                                    .eq(index)
                                    .attr('data-disqus-identifier');
                                this.page.url = $LG(_this.core.items)
                                    .eq(index)
                                    .attr('data-disqus-url');
                                this.page.title = this.settings.disqusConfig.title;
                                this.language = this.settings.disqusConfig.language;
                            },
                        });
                    } catch (err) {
                        console.error(
                            'Make sure you have included disqus JavaScript code in your document. Ex - https://lg-disqus.disqus.com/admin/install/platforms/universalcode/',
                        );
                    }
                },
                _this.core.lGalleryOn ? 0 : 1000,
            );
        });
    }

    destroy(clear?: boolean): void {
        if (clear) {
            this.core.LGel.off('.lg.comment');
        }
    }
}

window.lgModules = window.lgModules || {};
window.lgModules.commentBox = CommentBox;
