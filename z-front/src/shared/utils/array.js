export function handleFilter(input, option) {
  return option.props.children.toLowerCase().includes(input.toLowerCase());
}

export function handleSort(arr, key = 'displayName') {
  const regex = /Dr. |Prof. |A.Prof. |Mr. |Ms. /g;
  const normalizeStr = str => str.replace(regex, '').toLowerCase();

  return [...arr].sort((a, b) => {
    const normalizedA = normalizeStr(a[key]);
    const normalizedB = normalizeStr(b[key]);
    if (normalizedA < normalizedB) return -1;
    if (normalizedA > normalizedB) return 1;
    return 0;
  });
}
