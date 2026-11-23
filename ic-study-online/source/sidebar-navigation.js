(() => {
 const drawerMedia = window.matchMedia('(max-width:800px), (hover:none)');
 const sidebar = document.getElementById('study-sidebar');
 const workspace = document.querySelector('.workspace');
 const picker = document.getElementById('breadcrumb-picker');
 const launcher = document.querySelector('.sidebar-mobile-open');
 const close = sidebar.querySelector('.sidebar-drawer-close');
 let drawerOpen = false;

 function setDrawer(open, focus = false) {
  drawerOpen = open && drawerMedia.matches;
  const hidden = drawerMedia.matches && !drawerOpen;
  document.body.dataset.sidebar = drawerOpen ? 'open' : 'closed';
  sidebar.inert = hidden;
  sidebar.setAttribute('aria-hidden', String(hidden));
  workspace.inert = drawerOpen;
  launcher.setAttribute('aria-expanded', String(drawerOpen));
  if (focus) (drawerOpen ? close : launcher).focus({preventScroll: true});
 }

 function closeQuickMenu(focus = false) {
  picker.open = false;
  if (focus) picker.querySelector('summary').focus({preventScroll: true});
 }

 document.addEventListener('click', event => {
  const control = event.target.closest('[data-navigation]');
  if (control && drawerMedia.matches) {
   setDrawer(control.dataset.navigation === 'toggle' && !drawerOpen, true);
   return;
  }
  if (event.target.closest('[data-act="nav"], #study-sidebar a[data-study-link]')) {
   closeQuickMenu(!!event.target.closest('#breadcrumb-picker'));
   if (drawerOpen && event.target.closest('#study-sidebar')) setDrawer(false, true);
  } else if (!event.target.closest('#breadcrumb-picker')) {
   closeQuickMenu();
  }
 }, true);
 document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (picker.open) closeQuickMenu(true);
  else if (drawerOpen) setDrawer(false, true);
  else return;
  event.preventDefault();
 });
 drawerMedia.addEventListener('change', () => {
  closeQuickMenu();
  setDrawer(false);
 });
 setDrawer(false);
})();
