(function () {
  var marker = 'bq_reverted_dark_v1';
  try {
    if (!localStorage.getItem(marker)) {
      localStorage.setItem('bq_theme3', 'dark');
      localStorage.setItem(marker, '1');
      document.documentElement.dataset.theme = 'dark';
    }
  } catch (e) {}
}());
