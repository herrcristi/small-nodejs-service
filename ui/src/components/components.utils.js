/**
 * component utils
 */
const Utils = {
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
      h.push({ width: 100, title: t('actions'), value: 'actions', sortable: false });
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
      email: (v, t) => (!!v && v.toString().trim().length > 0) || t('email.required'),
      address: (v, t) => (!!v && v.toString().trim().length > 0) || t('required'),
      credits: (v, t) => {
        // credits must be a number greater than or equal to zero
        const n = Number(v);
        return (n != null && !Number.isNaN(n) && n >= 0 && n <= 1024) || t('credits.limits') || t('required');
      },
      required: (v, t) => !!v || t('required'),
    },

    /**
     * add
     */
    add: async (apiFn, payload, snackbar, t) => {
      try {
        await apiFn.create(payload);

        if (snackbar) {
          snackbar.text.value = t('add.success') || 'Added';
          snackbar.color.value = 'success';
          snackbar.ref.value = true;
        }

        return true;
      } catch (e) {
        console.error('Error adding:', e);
        const errText = e.response?.data?.error?.toString() || e.toString();

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
        const errText = e.response?.data?.error?.toString() || e.toString();

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
