/**
 * component utils
 */
import { reactive } from 'vue';

// the statuses of a failed request that have their own text (error.status.<status>); the others use the text of
// their class (400 or 500)
const ErrorStatuses = new Set([400, 401, 403, 404, 429, 500]);

const Utils = {
  /**
   * a spinner or a loader is shown only when a call takes longer than this (ms): a fast call shows nothing
   */
  LoadingDelay: 300,

  /**
   * one call at a time (a save, an invite, a login): while it is in progress a second click (or Enter) sends nothing,
   * and its button is disabled; the spinner (loading) is shown only after LoadingDelay
   * a dialog closes when its call starts: the call is shown on the button that opened the dialog (the + of a table,
   * the edit of a row: itemID), and the snackbar tells the result
   * returns a reactive { inProgress, loading, itemID, run }: run(fn, itemID?) calls fn only when no call is in progress
   * (it returns the result of fn, or undefined for an ignored click); itemID is the row the call is for (null: an add)
   */
  useSingleCall: () => {
    const call = reactive({ inProgress: false, loading: false, itemID: null });

    call.run = async (fn, itemID = null) => {
      // a call is in progress: the click is ignored
      if (call.inProgress) {
        return undefined;
      }

      call.inProgress = true;
      call.itemID = itemID;
      const timeoutID = setTimeout(() => {
        call.loading = true;
      }, Utils.LoadingDelay);

      try {
        return await fn();
      } finally {
        clearTimeout(timeoutID);
        call.inProgress = false;
        call.loading = false;
        call.itemID = null;
      }
    };

    return call;
  },

  /**
   * one call at a time per row (a delete): a second call for a row whose call is in progress sends nothing, the other
   * rows are not blocked; the button of the row is disabled, with a spinner after LoadingDelay
   * returns a reactive { isInProgress(itemID), isLoading(itemID), run(itemID, fn) }
   */
  useItemCalls: () => {
    const calls = reactive({ inProgress: new Set(), loading: new Set() });

    calls.isInProgress = (itemID) => calls.inProgress.has(itemID);
    calls.isLoading = (itemID) => calls.loading.has(itemID);

    calls.run = async (itemID, fn) => {
      // a call is in progress for this row: ignored
      if (calls.inProgress.has(itemID)) {
        return undefined;
      }

      calls.inProgress.add(itemID);
      const timeoutID = setTimeout(() => {
        calls.loading.add(itemID);
      }, Utils.LoadingDelay);

      try {
        return await fn();
      } finally {
        clearTimeout(timeoutID);
        calls.inProgress.delete(itemID);
        calls.loading.delete(itemID);
      }
    };

    return calls;
  },

  /**
   * the latest call of a component (a list, the details of an item): an answer that arrives after a newer call was
   * sent is dropped, so a late answer never replaces a newer one (the rows of an older filter, another item)
   * returns { next, isLatest }: next() before the call gives its number, isLatest(number) after the answer
   */
  useLatestCall: () => {
    let last = 0;

    const next = () => {
      last += 1;
      return last;
    };
    const isLatest = (number) => number === last;

    return { next, isLatest };
  },

  /**
   * the text of a failed request, for people
   * - a refused request (400): the reason the server gives (detail), after the text of the status
   * - other statuses: a text for the status, in the language of the UI (the server sends only a generic message for
   *   them, so it does not tell if an account exists, and never the cause of a server error)
   * - no answer: the server can not be reached; an error that is not of a request: its message
   */
  getErrorText: (e, t) => {
    const response = e?.response;
    if (!response) {
      if (e?.request) {
        return t('error.network');
      }
      return e?.message || `${e}`;
    }

    // the text of the status (its own, or the one of its class)
    let status = response.status >= 500 ? 500 : 400;
    if (ErrorStatuses.has(response.status)) {
      status = response.status;
    }
    const statusText = t(`error.status.${status}`);

    // the reason of a refused request
    const detail = response.data?.detail;
    if (typeof detail === 'string' && detail) {
      return `${statusText}: ${detail}`;
    }
    return statusText;
  },

  /**
   * fields titles
   * map user.name -> name
   */

  fieldsTitlesMap: {
    name: 'name',
    'user.name': 'name',
    'user.username': 'name',
    status: 'status',
    '_lang_en.status': 'status',
    'user.status': 'status',
    '_lang_en.user.status': 'status',
    email: 'email',
    'user.email': 'email',
    description: 'description',
    credits: 'credits',
    required: 'required',
    address: 'address',
    severity: 'severity',
    'target.name': 'target',
    message: 'message',
    '_lang_end.message': 'message',
    timestamp: 'timestamp',
    createdTimestamp: 'timestamp',
    class: 'class',
    'class.name': 'class',
    details: 'details',
    frequency: 'frequency',
    'location.name': 'name',
    'location.address': 'address',
  },

  /**
   * headers as each value
   * options: { actions?, details? }
   *  { title, key?, value?, sortable?, width? }
   */
  getHeaders: (fields, sortFields, options, t) => {
    const h = [];

    // details
    if (options?.details) {
      h.push({ title: '', key: 'details', value: 'details', sortable: false });
    }

    const sortFildsSet = new Set(sortFields);

    for (const field of fields) {
      const title = Utils.fieldsTitlesMap[field];
      if (!title) {
        continue;
      }

      if (sortFildsSet.has(field)) {
        h.push({ title: t(title), key: field });
      } else {
        h.push({ title: t(title), value: field });
      }
    }

    // actions
    if (options?.actions) {
      h.push({ width: 100, title: t('actions'), key: 'actions', value: 'actions', sortable: false });
    }

    // x-small width
    const xsmallWidthFields = new Set(['status', 'actions', 'details']);
    for (const hitem of h) {
      if (
        xsmallWidthFields.has(Utils.fieldsTitlesMap[hitem.key]) ||
        xsmallWidthFields.has(Utils.fieldsTitlesMap[hitem.value])
      ) {
        hitem.width = 50;
      }
    }
    // small width
    const smallWidthFields = new Set(['credits', 'required', 'severity']);
    for (const hitem of h) {
      if (
        smallWidthFields.has(Utils.fieldsTitlesMap[hitem.key]) ||
        smallWidthFields.has(Utils.fieldsTitlesMap[hitem.value])
      ) {
        hitem.width = 100;
      }
    }

    return h;
  },

  /**
   * a text translated by the server (the _lang_<language> copies of a record), in the language of the UI,
   * then in English, then the value itself
   * path: the field ('message', 'user.status')
   */
  getServerText: (item, path, locale) => {
    const read = (obj) => path.split('.').reduce((value, key) => value?.[key], obj);

    const localText = read(item?.[`_lang_${locale}`]);
    if (localText !== undefined && localText !== null) {
      return localText;
    }
    const englishText = read(item?._lang_en);
    if (englishText !== undefined && englishText !== null) {
      return englishText;
    }
    return read(item);
  },

  /**
   * the server languages to read with a projection: the language of the UI and English (the fallback)
   */
  getServerLanguages: (locale) => {
    const languages = new Set(['_lang_en', `_lang_${locale}`]);
    return [...languages].join(',');
  },

  /**
   * text for a status in the language of the UI (the same translations as the edit dialogs)
   * the label translated by the server is used only for a status the UI does not know
   * path: the field of the status ('status', 'user.status')
   */
  getStatusText: (item, path, t, te, locale) => {
    const status = path.split('.').reduce((value, key) => value?.[key], item);
    if (status && te(status)) {
      return t(status);
    }
    return Utils.getServerText(item, path, locale);
  },

  /**
   * color for status
   */
  getStatusColor: (status) => {
    switch (status) {
      case 'pending':
        return 'none';

      case 'active':
        return 'green';

      case 'disabled':
        return 'grey';

      case 'deleted':
        return 'grey';

      default:
        return 'grey'; // for any other values
    }
  },

  /**
   * color for required
   */
  getRequiredColor: (required) => {
    switch (required) {
      case 'required':
        return 'indigo';

      case 'optional':
      default:
        return 'grey';
    }
  },

  /**
   * color for severity
   */
  getSeverityColor: (severity) => {
    switch (severity) {
      case 'critical':
        return 'red';

      case 'warning':
        return 'orange';

      case 'info':
        return 'green';

      default:
        return 'grey';
    }
  },

  /**
   * custom filter = search for case insensitive query in each field of item
   */
  findValue: (filterFields, value, query, item) => {
    let q = query?.toLocaleUpperCase();
    if (q == null) {
      return false;
    }

    for (const field of filterFields || []) {
      let value = item?.raw;

      const subFields = field.split('.');
      for (const subField of subFields) {
        if (value == null) {
          break;
        }
        value = value[subField];
      }

      value = value?.toString().toLocaleUpperCase();
      if (value && value.indexOf(q) !== -1) {
        return true;
      }
    }
    return false;
  },

  /**
   * edit utils
   */
  Edit: {
    /**
     * frequency options
     */
    frequencyItems: (t) => {
      // base items
      // when adding add pending too
      let items = [
        { title: t('once'), value: 'once' },
        { title: t('weekly'), value: 'weekly' },
        { title: t('biweekly'), value: 'biWeekly' },
        { title: t('monthly'), value: 'monthly' },
      ];

      return items;
    },

    /**
     * frequency dates 1-31
     */
    frequencyDates: (t) => {
      const dates = [];
      for (let d = 1; d <= 31; d++) {
        const title = d.toString();
        const value = d.toString();
        dates.push({ title, value });
      }
      return dates;
    },

    /**
     * frequency days Monday-Sunday
     */
    frequencyDays: (t) => {
      return [
        { title: t('monday'), value: '1' },
        { title: t('tuesday'), value: '2' },
        { title: t('wednesday'), value: '3' },
        { title: t('thursday'), value: '4' },
        { title: t('friday'), value: '5' },
        { title: t('saturday'), value: '6' },
        { title: t('sunday'), value: '0' },
      ];
    },

    /**
     * frequency hours 00:00 - 23:45 each 15 minutes
     */
    frequencyHours: (t, minutesStep = 15) => {
      const hours = [];
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += minutesStep) {
          const title = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          const value = title;
          hours.push({ title, value });
        }
      }
      return hours;
    },

    /**
     * status items for the select
     * options: { skipPending? }
     */
    statusItems: (t, options = null) => {
      // base items
      // when adding add pending too
      let items = [];

      if (!options?.skipPending) {
        items.push({ title: t('pending'), value: 'pending' });
      }

      items = [
        ...items,
        { title: t('active'), value: 'active' },
        { title: t('disabled'), value: 'disabled', disabled: false },
      ];

      return items;
    },

    /**
     * required items for the select
     */
    requiredItems: (t) => {
      return [
        { title: t('required'), value: 'required' },
        { title: t('optional'), value: 'optional' },
      ];
    },

    /**
     * rules
     */
    Rules: {
      name: (v, t) => (!!v && v.toString().trim().length > 0) || t('name.required'),
      status: (v, t) => !!v || t('required'),
      emailReq: (v, t) => (!!v && v.toString().trim().length > 0) || t('email.required'),
      emailValid: (v, t) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!v) {
          return t('email.invalid');
        }
        const value = v.toString().trim();
        return emailRegex.test(value) || t('email.invalid');
      },
      address: (v, t) => (!!v && v.toString().trim().length > 0) || t('required'),
      credits: (v, t) => {
        // credits must be a number greater than or equal to zero
        const n = Number(v);
        return (n != null && !Number.isNaN(n) && n >= 0 && n <= 1024) || t('credits.limits') || t('required');
      },
      required: (v, t) => !!v || t('required'),
      passwordReq: (v, t) => (!!v && v.toString().trim().length > 0) || t('password.current.required'),
      // min 8 chars
      passwordNewReq: (v, t) => (!!v && v.toString().trim().length > 0) || t('password.new.required'),
      passwordMinLength: (v, t) => (!!v && v.toString().trim().length >= 8) || t('password.new.length'),
      passwordComplex: (v, t) => {
        // client-side password strength rule: uppercase, lowercase, digit, special char
        const passwordRegex = /(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}/;
        return (!!v && passwordRegex.test(v)) || t('password.new.complexity');
      },
      confirmPassword: (v, t, password) => (!!v && v === password) || t('password.must.match'),
    },

    /**
     * add
     * options: { successKey? } the text of the success ('invite.success' for an invite: its answer is the same for a
     * new user, an existing user and a member, so the UI can only say that the invitation was sent)
     * returns true when added (the snackbar tells the result)
     */
    add: async (apiFn, payload, snackbar, t, options = null) => {
      try {
        const response = await apiFn.create(payload);

        // saved, but its email could not be sent (an invite): inviting again sends it again
        const emailNotSent = response?.data?.emailSent === false;
        if (snackbar) {
          snackbar.text.value = emailNotSent ? t('invite.email.failed') : t(options?.successKey || 'add.success');
          snackbar.color.value = emailNotSent ? 'warning' : 'success';
          snackbar.ref.value = true;
        }

        return true;
      } catch (e) {
        console.error('Error adding:', e);
        const errText = Utils.getErrorText(e, t);

        if (snackbar) {
          snackbar.text.value = (t('add.error') || 'Error adding') + ' - ' + errText;
          snackbar.color.value = 'error';
          snackbar.ref.value = true;
        }

        return false;
      }
    },

    /**
     * update
     * returns true when updated (the snackbar tells the result)
     */
    update: async (apiFn, itemID, payload, snackbar, t) => {
      try {
        await apiFn.update(itemID, payload);

        if (snackbar) {
          snackbar.text.value = t('update.success') || 'Updated';
          snackbar.color.value = 'success';
          snackbar.ref.value = true;
        }

        return true;
      } catch (e) {
        console.error('Error updating:', e);
        const errText = Utils.getErrorText(e, t);

        if (snackbar) {
          snackbar.text.value = (t('update.error') || 'Error updating') + ' - ' + errText;
          snackbar.color.value = 'error';
          snackbar.ref.value = true;
        }

        return false;
      }
    },

    /**
     * trim a field
     */
    trimField: (itemData, field) => {
      if (itemData[field]) {
        itemData[field] = itemData[field].toString().trim();
      }
    },

    trimFields: (itemData, fields) => {
      for (const field of fields) {
        Utils.Edit.trimField(itemData, field);
      }
    },
  },
};

export default Utils;
