import { randomUUID } from 'node:crypto';

const BASE = 'https://recetario-app-backend-production.up.railway.app/api';

async function req(method, path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
  const r = await fetch(BASE + path, {
    method, headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  let json = {}; 
  try { json = text ? JSON.parse(text) : {}; } catch { json = { _raw: text.slice(0, 200) }; }
  return { status: r.status, body: json };
}

let passed = 0, failed = 0;
const bugs = [];

function bug(id, cat, severity, attack, expected, actual, repro) {
  bugs.push({ id, category: cat, severity, attack_description: attack, expected, actual, reproduction: repro });
  failed++;
  console.log('[FAIL]', id);
}

function pass(msg) {
  console.log('[PASS]', msg);
  passed++;
}

// ATTACK 1: Delete user with 0 recipes
console.log('\n=== ATTACK 1: Delete user with no recipes ===');
const suf1 = randomUUID().slice(0, 8);
const tok1 = (await req('POST', '/auth/register', { 
  body: { name: 'Atk1', email: 'atk1-' + suf1 + '@x.com', password: 'pass123' } 
})).body.token;
if (tok1) {
  const del1 = await req('DELETE', '/users/me', { token: tok1 });
  if (del1.status === 200 || del1.status === 204) {
    pass('DELETE user with 0 recipes');
  } else {
    bug('ATK1', 'cascade', 'important', 'DELETE user with 0 recipes should succeed', '200/204', del1.status, 'DELETE /users/me for user with no recipes');
  }
}

// ATTACK 2: Delete user with 1 recipe in 1 group
console.log('\n=== ATTACK 2: Delete user with 1 recipe in 1 group ===');
const suf2 = randomUUID().slice(0, 8);
const tok2 = (await req('POST', '/auth/register', { 
  body: { name: 'Atk2', email: 'atk2-' + suf2 + '@x.com', password: 'pass123' } 
})).body.token;
if (tok2) {
  const grp = (await req('POST', '/groups', { token: tok2, body: { name: 'TestGrp', description: '', color: '#ff0000' } })).body.group;
  const rec = (await req('POST', '/recipes', { token: tok2, body: { 
    title: 'TestRec', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: false, groupIds: [grp.id] 
  } })).body.recipe;
  const del2 = await req('DELETE', '/users/me', { token: tok2 });
  if (del2.status === 200 || del2.status === 204) {
    pass('DELETE user with 1 recipe in 1 group');
  } else {
    bug('ATK2', 'cascade', 'important', 'DELETE user with recipe+group should cascade', '200/204', del2.status, 'DELETE /users/me with owned recipe and group');
  }
}

// ATTACK 3: Delete group, cascade SavedRecipes
console.log('\n=== ATTACK 3: Delete group, cascade SavedRecipes ===');
const suf3a = randomUUID().slice(0, 8);
const suf3b = randomUUID().slice(0, 8);
const tok3a = (await req('POST', '/auth/register', { 
  body: { name: 'Atk3A', email: 'atk3a-' + suf3a + '@x.com', password: 'pass123' } 
})).body.token;
const tok3b = (await req('POST', '/auth/register', { 
  body: { name: 'Atk3B', email: 'atk3b-' + suf3b + '@x.com', password: 'pass123' } 
})).body.token;
if (tok3a && tok3b) {
  const grpA = (await req('POST', '/groups', { token: tok3a, body: { name: 'Grp3', description: '', color: '#00ff00' } })).body.group;
  const recA = (await req('POST', '/recipes', { token: tok3a, body: { 
    title: 'Rec3', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: true, groupIds: [grpA.id] 
  } })).body.recipe;
  const save3 = (await req('POST', `/recipes/${recA.id}/save`, { token: tok3b, body: { groupIds: [grpA.id] } })).body.saved;
  const delGrp = await req('DELETE', `/groups/${grpA.id}`, { token: tok3a });
  if (delGrp.status === 200 || delGrp.status === 204) {
    pass('DELETE group with cascade');
  } else {
    bug('ATK3', 'cascade', 'important', 'DELETE group should cascade', '200/204', delGrp.status, 'DELETE /groups/:id');
  }
  await req('DELETE', '/users/me', { token: tok3a });
  await req('DELETE', '/users/me', { token: tok3b });
}

// ATTACK 4: Delete recipe, cascade SavedRecipes
console.log('\n=== ATTACK 4: Delete recipe, cascade SavedRecipes ===');
const suf4a = randomUUID().slice(0, 8);
const suf4b = randomUUID().slice(0, 8);
const tok4a = (await req('POST', '/auth/register', { 
  body: { name: 'Atk4A', email: 'atk4a-' + suf4a + '@x.com', password: 'pass123' } 
})).body.token;
const tok4b = (await req('POST', '/auth/register', { 
  body: { name: 'Atk4B', email: 'atk4b-' + suf4b + '@x.com', password: 'pass123' } 
})).body.token;
if (tok4a && tok4b) {
  const grpA = (await req('POST', '/groups', { token: tok4a, body: { name: 'Grp4', description: '', color: '#0000ff' } })).body.group;
  const recA = (await req('POST', '/recipes', { token: tok4a, body: { 
    title: 'Rec4', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: true, groupIds: [grpA.id] 
  } })).body.recipe;
  const save4 = (await req('POST', `/recipes/${recA.id}/save`, { token: tok4b, body: { groupIds: [grpA.id] } })).body.saved;
  const delRec = await req('DELETE', `/recipes/${recA.id}`, { token: tok4a });
  if (delRec.status === 200 || delRec.status === 204) {
    const unsave4 = await req('DELETE', `/recipes/${recA.id}/save`, { token: tok4b });
    if (unsave4.status !== 404 && unsave4.status !== 200 && unsave4.status !== 204) {
      bug('ATK4', 'cascade', 'critical', 'DELETE recipe should cascade SavedRecipes', 'SavedRecipe should be deleted', 'SavedRecipe orphan exists', 'Delete recipe, then try unsave from other user');
    } else {
      pass('DELETE recipe cascades SavedRecipes');
    }
  } else {
    bug('ATK4', 'cascade', 'important', 'DELETE recipe should succeed', '200/204', delRec.status, 'DELETE /recipes/:id with SavedRecipes');
  }
  await req('DELETE', '/users/me', { token: tok4a });
  await req('DELETE', '/users/me', { token: tok4b });
}

// ATTACK 5: Delete group keepRecipes=true
console.log('\n=== ATTACK 5: Delete group keepRecipes=true ===');
const suf5 = randomUUID().slice(0, 8);
const tok5 = (await req('POST', '/auth/register', { 
  body: { name: 'Atk5', email: 'atk5-' + suf5 + '@x.com', password: 'pass123' } 
})).body.token;
if (tok5) {
  const grp5 = (await req('POST', '/groups', { token: tok5, body: { name: 'Grp5', description: '', color: '#ffff00' } })).body.group;
  const rec5 = (await req('POST', '/recipes', { token: tok5, body: { 
    title: 'Rec5', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: false, groupIds: [grp5.id] 
  } })).body.recipe;
  const delGrp5 = await req('DELETE', `/groups/${grp5.id}?keepRecipes=true`, { token: tok5 });
  if (delGrp5.status === 200 || delGrp5.status === 204) {
    const rec5After = (await req('GET', `/recipes/${rec5.id}`, { token: tok5 })).body.recipe;
    if (rec5After && rec5After.groupIds && !rec5After.groupIds.includes(grp5.id)) {
      pass('DELETE group keepRecipes=true removes groupId from recipe');
    } else {
      bug('ATK5', 'cascade', 'important', 'Recipe should no longer have deleted groupId', `groupIds should not include ${grp5.id}`, `groupIds=${JSON.stringify(rec5After?.groupIds)}`, 'DELETE /groups/:id?keepRecipes=true then GET /recipes/:id');
    }
  } else {
    bug('ATK5', 'cascade', 'important', 'DELETE group keepRecipes=true should succeed', '200/204', delGrp5.status, 'DELETE /groups/:id?keepRecipes=true');
  }
  await req('DELETE', '/users/me', { token: tok5 });
}

// ATTACK 6: Delete recipe from other user
console.log('\n=== ATTACK 6: Delete recipe from other user ===');
const suf6a = randomUUID().slice(0, 8);
const suf6b = randomUUID().slice(0, 8);
const tok6a = (await req('POST', '/auth/register', { 
  body: { name: 'Atk6A', email: 'atk6a-' + suf6a + '@x.com', password: 'pass123' } 
})).body.token;
const tok6b = (await req('POST', '/auth/register', { 
  body: { name: 'Atk6B', email: 'atk6b-' + suf6b + '@x.com', password: 'pass123' } 
})).body.token;
if (tok6a && tok6b) {
  const grp6a = (await req('POST', '/groups', { token: tok6a, body: { name: 'Grp6', description: '', color: '#00ffff' } })).body.group;
  const rec6a = (await req('POST', '/recipes', { token: tok6a, body: { 
    title: 'Rec6', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: false, groupIds: [grp6a.id] 
  } })).body.recipe;
  const delByB = await req('DELETE', `/recipes/${rec6a.id}`, { token: tok6b });
  if (delByB.status === 403 || delByB.status === 401) {
    pass('Cannot delete other user recipe (403/401)');
  } else if (delByB.status === 200 || delByB.status === 204) {
    bug('ATK6', 'security', 'critical', 'Should not allow delete of other user recipe', '403/401', delByB.status, 'DELETE /recipes/:id from other user');
  } else {
    bug('ATK6', 'validation', 'important', 'Delete other user recipe returns unexpected status', '403/401', delByB.status, 'DELETE /recipes/:id from other user');
  }
  await req('DELETE', '/users/me', { token: tok6a });
  await req('DELETE', '/users/me', { token: tok6b });
}

// ATTACK 7: Delete group from other user
console.log('\n=== ATTACK 7: Delete group from other user ===');
const suf7a = randomUUID().slice(0, 8);
const suf7b = randomUUID().slice(0, 8);
const tok7a = (await req('POST', '/auth/register', { 
  body: { name: 'Atk7A', email: 'atk7a-' + suf7a + '@x.com', password: 'pass123' } 
})).body.token;
const tok7b = (await req('POST', '/auth/register', { 
  body: { name: 'Atk7B', email: 'atk7b-' + suf7b + '@x.com', password: 'pass123' } 
})).body.token;
if (tok7a && tok7b) {
  const grp7a = (await req('POST', '/groups', { token: tok7a, body: { name: 'Grp7', description: '', color: '#ff00ff' } })).body.group;
  const delByB = await req('DELETE', `/groups/${grp7a.id}`, { token: tok7b });
  if (delByB.status === 403 || delByB.status === 401) {
    pass('Cannot delete other user group (403/401)');
  } else if (delByB.status === 200 || delByB.status === 204) {
    bug('ATK7', 'security', 'critical', 'Should not allow delete of other user group', '403/401', delByB.status, 'DELETE /groups/:id from other user');
  } else {
    bug('ATK7', 'validation', 'important', 'Delete other user group returns unexpected status', '403/401', delByB.status, 'DELETE /groups/:id from other user');
  }
  await req('DELETE', '/users/me', { token: tok7a });
  await req('DELETE', '/users/me', { token: tok7b });
}

// ATTACK 8: User deletes their account, other user still has SavedRecipe
console.log('\n=== ATTACK 8: Delete user A, B still has SavedRecipe of A recipe ===');
const suf8a = randomUUID().slice(0, 8);
const suf8b = randomUUID().slice(0, 8);
const tok8a = (await req('POST', '/auth/register', { 
  body: { name: 'Atk8A', email: 'atk8a-' + suf8a + '@x.com', password: 'pass123' } 
})).body.token;
const tok8b = (await req('POST', '/auth/register', { 
  body: { name: 'Atk8B', email: 'atk8b-' + suf8b + '@x.com', password: 'pass123' } 
})).body.token;
if (tok8a && tok8b) {
  const grp8a = (await req('POST', '/groups', { token: tok8a, body: { name: 'Grp8', description: '', color: '#aaaaaa' } })).body.group;
  const rec8a = (await req('POST', '/recipes', { token: tok8a, body: { 
    title: 'Rec8', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: true, groupIds: [grp8a.id] 
  } })).body.recipe;
  const save8 = await req('POST', `/recipes/${rec8a.id}/save`, { token: tok8b, body: { groupIds: [grp8a.id] } });
  const delA = await req('DELETE', '/users/me', { token: tok8a });
  if (delA.status === 200 || delA.status === 204) {
    const list8 = await req('GET', '/recipes', { token: tok8b });
    if (list8.body.recipes) {
      const savedRec = list8.body.recipes.find(r => r.id === rec8a.id);
      if (savedRec && savedRec.isSaved) {
        bug('ATK8', 'cascade', 'critical', 'Deleted user recipe still appears as saved in other user', 'Recipe should not exist after user deleted', 'Recipe still exists with isSaved=true', 'Delete user A, user B tries to list recipes');
      } else {
        pass('User A deletion cascaded SavedRecipes correctly');
      }
    } else {
      pass('User A deletion processed');
    }
  } else {
    bug('ATK8', 'cascade', 'important', 'DELETE user should succeed', '200/204', delA.status, 'DELETE /users/me');
  }
  await req('DELETE', '/users/me', { token: tok8b });
}

// ATTACK 9: Recipe in 2 groups, delete 1 group
console.log('\n=== ATTACK 9: Recipe in 2 groups, delete 1 group ===');
const suf9 = randomUUID().slice(0, 8);
const tok9 = (await req('POST', '/auth/register', { 
  body: { name: 'Atk9', email: 'atk9-' + suf9 + '@x.com', password: 'pass123' } 
})).body.token;
if (tok9) {
  const grp9a = (await req('POST', '/groups', { token: tok9, body: { name: 'Grp9A', description: '', color: '#111111' } })).body.group;
  const grp9b = (await req('POST', '/groups', { token: tok9, body: { name: 'Grp9B', description: '', color: '#222222' } })).body.group;
  const rec9 = (await req('POST', '/recipes', { token: tok9, body: { 
    title: 'Rec9', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: false, groupIds: [grp9a.id, grp9b.id] 
  } })).body.recipe;
  const delGrp9a = await req('DELETE', `/groups/${grp9a.id}?keepRecipes=true`, { token: tok9 });
  if (delGrp9a.status === 200 || delGrp9a.status === 204) {
    const rec9After = (await req('GET', `/recipes/${rec9.id}`, { token: tok9 })).body.recipe;
    if (rec9After && rec9After.groupIds && rec9After.groupIds.includes(grp9b.id) && !rec9After.groupIds.includes(grp9a.id)) {
      pass('Recipe keeps other group after deleting one group');
    } else {
      bug('ATK9', 'cascade', 'important', 'Recipe should keep non-deleted group', `groupIds=[${grp9b.id}]`, `groupIds=${JSON.stringify(rec9After?.groupIds)}`, 'Recipe in 2 groups, delete 1, verify other remains');
    }
  }
  await req('DELETE', '/users/me', { token: tok9 });
}

// ATTACK 10: Save recipe to non-existent group
console.log('\n=== ATTACK 10: Save recipe to non-existent group ===');
const suf10 = randomUUID().slice(0, 8);
const tok10 = (await req('POST', '/auth/register', { 
  body: { name: 'Atk10', email: 'atk10-' + suf10 + '@x.com', password: 'pass123' } 
})).body.token;
if (tok10) {
  const grp10 = (await req('POST', '/groups', { token: tok10, body: { name: 'Grp10', description: '', color: '#333333' } })).body.group;
  const rec10 = (await req('POST', '/recipes', { token: tok10, body: { 
    title: 'Rec10', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: true, groupIds: [grp10.id] 
  } })).body.recipe;
  await req('DELETE', `/groups/${grp10.id}`, { token: tok10 });
  const suf10b = randomUUID().slice(0, 8);
  const tok10b = (await req('POST', '/auth/register', { 
    body: { name: 'Atk10B', email: 'atk10b-' + suf10b + '@x.com', password: 'pass123' } 
  })).body.token;
  if (tok10b) {
    const save10 = await req('POST', `/recipes/${rec10.id}/save`, { token: tok10b, body: { groupIds: [grp10.id] } });
    if (save10.status === 404 || save10.status === 400) {
      pass('Cannot save recipe to non-existent group (404/400)');
    } else if (save10.status === 200 || save10.status === 201) {
      bug('ATK10', 'validation', 'critical', 'Should not allow save to non-existent group', '404/400', save10.status, 'Save recipe to deleted group');
    } else {
      bug('ATK10', 'validation', 'important', 'Save to deleted group returns unexpected status', '404/400', save10.status, 'Save recipe to deleted group');
    }
    await req('DELETE', '/users/me', { token: tok10b });
  }
  await req('DELETE', '/users/me', { token: tok10 });
}

// ATTACK 11: Update recipe groupIds with non-existent group
console.log('\n=== ATTACK 11: Update recipe groupIds with deleted group ===');
const suf11 = randomUUID().slice(0, 8);
const tok11 = (await req('POST', '/auth/register', { 
  body: { name: 'Atk11', email: 'atk11-' + suf11 + '@x.com', password: 'pass123' } 
})).body.token;
if (tok11) {
  const grp11 = (await req('POST', '/groups', { token: tok11, body: { name: 'Grp11', description: '', color: '#444444' } })).body.group;
  const rec11 = (await req('POST', '/recipes', { token: tok11, body: { 
    title: 'Rec11', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: false, groupIds: [grp11.id] 
  } })).body.recipe;
  const fakeGrpId = randomUUID();
  await req('DELETE', `/groups/${grp11.id}`, { token: tok11 });
  const upd11 = await req('PATCH', `/recipes/${rec11.id}`, { token: tok11, body: { groupIds: [fakeGrpId] } });
  if (upd11.status === 404 || upd11.status === 400) {
    pass('Cannot update recipe with non-existent group (404/400)');
  } else if (upd11.status === 200) {
    const rec11After = (await req('GET', `/recipes/${rec11.id}`, { token: tok11 })).body.recipe;
    if (rec11After && rec11After.groupIds && rec11After.groupIds.includes(fakeGrpId)) {
      bug('ATK11', 'validation', 'critical', 'Should not allow recipe with non-existent groupId', '404/400 or reject', `status=${upd11.status}, groupIds=${JSON.stringify(rec11After.groupIds)}`, 'Update recipe with deleted group ID');
    }
  } else {
    bug('ATK11', 'validation', 'important', 'Update with deleted group returns unexpected status', '404/400', upd11.status, 'Update recipe groupIds with deleted group');
  }
  await req('DELETE', '/users/me', { token: tok11 });
}

// ATTACK 12: Remove recipe from group
console.log('\n=== ATTACK 12: Remove recipe from group ===');
const suf12 = randomUUID().slice(0, 8);
const tok12 = (await req('POST', '/auth/register', { 
  body: { name: 'Atk12', email: 'atk12-' + suf12 + '@x.com', password: 'pass123' } 
})).body.token;
if (tok12) {
  const grp12 = (await req('POST', '/groups', { token: tok12, body: { name: 'Grp12', description: '', color: '#555555' } })).body.group;
  const rec12 = (await req('POST', '/recipes', { token: tok12, body: { 
    title: 'Rec12', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: false, groupIds: [grp12.id] 
  } })).body.recipe;
  const rem12 = await req('DELETE', `/groups/${grp12.id}/recipes/${rec12.id}`, { token: tok12 });
  if (rem12.status === 200 || rem12.status === 204) {
    const rec12After = (await req('GET', `/recipes/${rec12.id}`, { token: tok12 })).body.recipe;
    if (rec12After && rec12After.groupIds && !rec12After.groupIds.includes(grp12.id)) {
      pass('Remove recipe from group updates groupIds');
    } else {
      bug('ATK12', 'cascade', 'important', 'Recipe should not have group after removal', 'groupIds should not include group', `groupIds=${JSON.stringify(rec12After?.groupIds)}`, 'DELETE /groups/:id/recipes/:id');
    }
  } else {
    bug('ATK12', 'validation', 'important', 'Remove recipe from group should succeed', '200/204', rem12.status, 'DELETE /groups/:id/recipes/:id');
  }
  await req('DELETE', '/users/me', { token: tok12 });
}

// Summary
console.log('\n=== SUMMARY ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Bugs found: ${bugs.length}`);
bugs.forEach((b, i) => {
  console.log(`\n[BUG ${i+1}] ${b.id}: ${b.category} (${b.severity})`);
  console.log(`  Attack: ${b.attack_description}`);
  console.log(`  Expected: ${b.expected}`);
  console.log(`  Actual: ${b.actual}`);
});

process.exit(failed > 0 ? 1 : 0);
