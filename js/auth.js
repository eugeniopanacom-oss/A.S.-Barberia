const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userSection = document.getElementById('userSection');
const adminSection = document.getElementById('adminSection');

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    loginBtn.hidden = true;
    logoutBtn.hidden = false;
    // Si el mail está en la lista de admin, mostramos panel
    const admins = ['eugeniopanacom@gmail.com']; // agregá los que quieras
    if (admins.includes(user.email)) {
      adminSection.hidden = false;
      userSection.hidden = true;
    } else {
      userSection.hidden = false;
    }
  } else {
    loginBtn.hidden = false;
    logoutBtn.hidden = true;
    userSection.hidden = true;
    adminSection.hidden = true;
  }
});

loginBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
};
logoutBtn.onclick = () => firebase.auth().signOut();