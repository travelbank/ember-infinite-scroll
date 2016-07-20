import Ember from 'ember';

const { $, get, getWithDefault, on, run, set } = Ember;
const $window = $(window);
const $document = $(document);

const EPSILON = 150;

export default Ember.Component.extend({
  action: 'fetchMore',
  epsilon: EPSILON,
  isFetching: false,
  hasMore: null,
  content: null,
  scrollElement: null,
  debounce: null,

  setup: on('didInsertElement', function () {
    this.safeSet('$scrollElement', $window);
    this.safeSet('scrollEvent', `scroll.${this.elementId}`);

    if (typeof get(this, 'scrollElement') === 'string') {
      this.safeSet('$scrollElement', $(`${this.scrollElement}:first`));
      this.safeSet('scrollEvent', 'scroll');
    }

    if (typeof get(this, 'debounce') !== 'boolean' && typeof get(this, 'debounce') !== 'number' ) {
      this.safeSet('debounce', false);
    }

    const scrollHandlerId = `scrollHandler_${Math.ceil(Math.random() * 100000)}`;

    this.safeSet('scrollHandlerId', scrollHandlerId);
    get(this, '$scrollElement').on(get(this, 'scrollEvent'), run.bind(this, this.didScroll));
  }),

  teardown: on('willDestroyElement', function () {
    get(this, '$scrollElement').off(get(this, 'scrollEvent'));

    if (get(this, 'timeout')) {
      clearTimeout( this.get( 'timeout' ) );
    }
  }),

  didScroll() {
    if (!get(this, 'debounce')) {
      this.handleScroll();
    } else {
      clearTimeout( this.get( 'timeout' ) );

      const timer = typeof get(this, 'debounce' ) === 'number' ? get(this, 'debounce') : 250;
      this.safeSet('timeout', setTimeout(this.handleScroll.bind(this), timer));
    }
  },

  handleScroll(){
    if (!get(this, 'isFetching') && get(this, 'hasMore') && this.isNearBottom()) {
      this.safeSet('isFetching', true);
      this.sendAction('action', run.bind(this, this.handleFetch));
    }
  },

  handleFetch(promise) {
    const success = run.bind(this, this.fetchDidSucceed);
    const failure = run.bind(this, this.fetchDidFail);

    return promise.then(success, failure);
  },

  fetchDidSucceed(response) {
    const content = get(this, 'content');
    const newContent = getWithDefault(response, 'content', response);

    this.safeSet('isFetching', false);
    if (content) { content.pushObjects(newContent); }
  },

  fetchDidFail() {
    this.safeSet('isFetching', false);
  },

  isNearBottom() {
    if (this.$scrollElement === $window ) {
      /** Keep our legacy functionality if we're listening to the window scroll event */
      const viewPortTop = $document.scrollTop();
      const bottomTop = ($document.height() - $window.height());

      return viewPortTop && (bottomTop - viewPortTop) < get(this, 'epsilon');
    } else {
      /**
       * We're going to use the scroll element to calculate the height, if we're not using the default functionality
       * from: http://stackoverflow.com/questions/6271237/detecting-when-user-scrolls-to-bottom-of-div-with-jquery
       * retreived: 20150205
       */
      return get(this, '$scrollElement').scrollTop() + get(this, '$scrollElement').innerHeight() >= get(this, '$scrollElement')[0].scrollHeight - get(this, 'epsilon');
    }
  },

  safeSet(key, value) {
    if (!this.isDestroyed && !this.isDestroying) { set(this, key, value); }
  }
});
