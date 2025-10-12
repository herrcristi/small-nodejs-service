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
   *  { title, key?, value?, sortable?, width? }
   */
  getHeaders: (fields, sortFields, addActions, t) => {
    const h = [];

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
    if (addActions) {
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
};

export default Utils;
