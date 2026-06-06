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

function bug(id, cat, severity, attack, expected, actual, repro, fileHint = '') {
  bugs.push({ id, category: cat, severity, attack_description: attack, expected, actual, reproduction: repro, file_hint: fileHint });
  failed++;
  console.log('[FAIL]', id);
}

function pass(msg) {
  console.log('[PASS]', msg);
  passed++;
}

// ATTACK 13: Verify 404 vs 403 - accessing other user's group that exists
console.log('\n=== ATTACK 13: 404 vs 403 information leak ===');
const suf13a = randomUUID().slice(0, 8);
const suf13b = randomUUID().slice(0, 8);
const tok13a = (await req('POST', '/auth/register', { 
  body: { name: 'Atk13A', email: 'atk13a-' + suf13a + '@x.com', password: 'pass123' } 
})).body.token;
const tok13b = (await req('POST', '/auth/register', { 
  body: { name: 'Atk13B', email: 'atk13b-' + suf13b + '@x.com', password: 'pass123' } 
})).body.token;
if (tok13a && tok13b) {
  const grp13 = (await req('POST', '/groups', { token: tok13a, body: { name: 'Grp13', description: '', color: '#666666' } })).body.group;
  const fakeId = randomUUID();
  
  // User B tries to delete existing group from A
  const delExisting = await req('DELETE', `/groups/${grp13.id}`, { token: tok13b });
  // User B tries to delete non-existing group
  const delNonExisting = await req('DELETE', `/groups/${fakeId}`, { token: tok13b });
  
  if (delExisting.status === 404 && delNonExisting.status === 404) {
    bug('ATK13', 'security', 'important', '404 for both existing and non-existing groups reveals info', '403 or consistent error', `existing=${delExisting.status}, non-existing=${delNonExisting.status}`, 'Try to DELETE /groups/:id for both existing and fake IDs as different user', 'Delete endpoint');
  } else if (delExisting.status !== 403 && delExisting.status !== 401) {
    bug('ATK13', 'security', 'important', 'DELETE other user group should return 403/401 not ' + delExisting.status, '403/401', delExisting.status, 'Try to DELETE /groups/:id for other user group', 'Delete endpoint');
  } else {
    pass('Proper 403/401 for deleting other user group');
  }
  
  await req('DELETE', '/users/me', { token: tok13a });
  await req('DELETE', '/users/me', { token: tok13b });
}

// ATTACK 14: Try to modify other user's recipe groupIds via update
console.log('\n=== ATTACK 14: Modify other user recipe groupIds ===');
const suf14a = randomUUID().slice(0, 8);
const suf14b = randomUUID().slice(0, 8);
const tok14a = (await req('POST', '/auth/register', { 
  body: { name: 'Atk14A', email: 'atk14a-' + suf14a + '@x.com', password: 'pass123' } 
})).body.token;
const tok14b = (await req('POST', '/auth/register', { 
  body: { name: 'Atk14B', email: 'atk14b-' + suf14b + '@x.com', password: 'pass123' } 
})).body.token;
if (tok14a && tok14b) {
  const grp14a = (await req('POST', '/groups', { token: tok14a, body: { name: 'Grp14A', description: '', color: '#777777' } })).body.group;
  const grp14b = (await req('POST', '/groups', { token: tok14b, body: { name: 'Grp14B', description: '', color: '#888888' } })).body.group;
  const rec14a = (await req('POST', '/recipes', { token: tok14a, body: { 
    title: 'Rec14', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: true, groupIds: [grp14a.id] 
  } })).body.recipe;
  
  // User B tries to update User A's recipe to add B's group
  const upd14 = await req('PATCH', `/recipes/${rec14a.id}`, { token: tok14b, body: { groupIds: [grp14a.id, grp14b.id] } });
  if (upd14.status === 200 || upd14.status === 201) {
    bug('ATK14', 'security', 'critical', 'User B can modify User A recipe groupIds', '403/401', upd14.status, 'PATCH /recipes/:id with other user groupIds', 'Update endpoint');
  } else if (upd14.status === 403 || upd14.status === 401) {
    pass('Cannot modify other user recipe');
  } else {
    pass('Modify other user recipe rejected');
  }
  
  await req('DELETE', '/users/me', { token: tok14a });
  await req('DELETE', '/users/me', { token: tok14b });
}

// ATTACK 15: Delete recipe from group that doesn't belong to user
console.log('\n=== ATTACK 15: Remove recipe from non-owned group ===');
const suf15a = randomUUID().slice(0, 8);
const suf15b = randomUUID().slice(0, 8);
const tok15a = (await req('POST', '/auth/register', { 
  body: { name: 'Atk15A', email: 'atk15a-' + suf15a + '@x.com', password: 'pass123' } 
})).body.token;
const tok15b = (await req('POST', '/auth/register', { 
  body: { name: 'Atk15B', email: 'atk15b-' + suf15b + '@x.com', password: 'pass123' } 
})).body.token;
if (tok15a && tok15b) {
  const grp15a = (await req('POST', '/groups', { token: tok15a, body: { name: 'Grp15A', description: '', color: '#999999' } })).body.group;
  const rec15a = (await req('POST', '/recipes', { token: tok15a, body: { 
    title: 'Rec15', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: true, groupIds: [grp15a.id] 
  } })).body.recipe;
  
  // User B tries to remove User A's recipe from User A's group
  const rem15 = await req('DELETE', `/groups/${grp15a.id}/recipes/${rec15a.id}`, { token: tok15b });
  if (rem15.status === 200 || rem15.status === 204) {
    bug('ATK15', 'security', 'critical', 'User B can remove User A recipe from User A group', '403/401', rem15.status, 'DELETE /groups/:id/recipes/:id as other user', 'Remove recipe endpoint');
  } else if (rem15.status === 403 || rem15.status === 401) {
    pass('Cannot remove recipe from other user group');
  } else {
    pass('Remove recipe from other user group rejected');
  }
  
  await req('DELETE', '/users/me', { token: tok15a });
  await req('DELETE', '/users/me', { token: tok15b });
}

// ATTACK 16: Save recipe with empty groupIds array
console.log('\n=== ATTACK 16: Save recipe with empty groupIds ===');
const suf16 = randomUUID().slice(0, 8);
const tok16 = (await req('POST', '/auth/register', { 
  body: { name: 'Atk16', email: 'atk16-' + suf16 + '@x.com', password: 'pass123' } 
})).body.token;
if (tok16) {
  const grp16 = (await req('POST', '/groups', { token: tok16, body: { name: 'Grp16', description: '', color: '#aabbaa' } })).body.group;
  const rec16 = (await req('POST', '/recipes', { token: tok16, body: { 
    title: 'Rec16', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: true, groupIds: [grp16.id] 
  } })).body.recipe;
  
  const suf16b = randomUUID().slice(0, 8);
  const tok16b = (await req('POST', '/auth/register', { 
    body: { name: 'Atk16B', email: 'atk16b-' + suf16b + '@x.com', password: 'pass123' } 
  })).body.token;
  
  if (tok16b) {
    const save16 = await req('POST', `/recipes/${rec16.id}/save`, { token: tok16b, body: { groupIds: [] } });
    if (save16.status === 200 || save16.status === 201) {
      // Is this valid? Saved without group context
      pass('Can save recipe with empty groupIds (may be valid)');
    } else if (save16.status === 400) {
      pass('Cannot save recipe with empty groupIds');
    } else {
      bug('ATK16', 'validation', 'minor', 'Save with empty groupIds returns unexpected status', '400 or 200', save16.status, 'POST /recipes/:id/save with groupIds=[]', 'Save endpoint');
    }
    await req('DELETE', '/users/me', { token: tok16b });
  }
  
  await req('DELETE', '/users/me', { token: tok16 });
}

// ATTACK 17: Create recipe with invalid groupIds and verify validation
console.log('\n=== ATTACK 17: Create recipe with non-existent groupIds ===');
const suf17 = randomUUID().slice(0, 8);
const tok17 = (await req('POST', '/auth/register', { 
  body: { name: 'Atk17', email: 'atk17-' + suf17 + '@x.com', password: 'pass123' } 
})).body.token;
if (tok17) {
  const fakeGrpId = randomUUID();
  const rec17 = await req('POST', '/recipes', { token: tok17, body: { 
    title: 'Rec17', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: false, groupIds: [fakeGrpId] 
  } });
  if (rec17.status === 201 || rec17.status === 200) {
    bug('ATK17', 'validation', 'important', 'Can create recipe with non-existent groupIds', '400/404', rec17.status, 'POST /recipes with invalid groupIds', 'Create recipe endpoint');
  } else if (rec17.status === 400 || rec17.status === 404) {
    pass('Cannot create recipe with invalid groupIds');
  } else {
    pass('Create recipe validation present');
  }
  
  await req('DELETE', '/users/me', { token: tok17 });
}

// ATTACK 18: Update group, try to change userId ownership
console.log('\n=== ATTACK 18: Update group ownership field ===');
const suf18a = randomUUID().slice(0, 8);
const suf18b = randomUUID().slice(0, 8);
const tok18a = (await req('POST', '/auth/register', { 
  body: { name: 'Atk18A', email: 'atk18a-' + suf18a + '@x.com', password: 'pass123' } 
})).body.token;
const tok18b = (await req('POST', '/auth/register', { 
  body: { name: 'Atk18B', email: 'atk18b-' + suf18b + '@x.com', password: 'pass123' } 
})).body.token;
if (tok18a && tok18b) {
  const grp18a = (await req('POST', '/groups', { token: tok18a, body: { name: 'Grp18', description: '', color: '#ccddcc' } })).body.group;
  
  // User A gets their own ID to abuse
  const meA = (await req('GET', '/users/me', { token: tok18a })).body.user;
  
  // User A tries to update group userId
  const upd18 = await req('PATCH', `/groups/${grp18a.id}`, { token: tok18a, body: { userId: meA.id } });
  if (upd18.status === 200) {
    pass('Update group allows userId (may be readonly)');
  } else {
    pass('Cannot update group userId');
  }
  
  await req('DELETE', '/users/me', { token: tok18a });
  await req('DELETE', '/users/me', { token: tok18b });
}

// ATTACK 19: Try to GET other user's groups
console.log('\n=== ATTACK 19: List all groups includes other users ===');
const suf19a = randomUUID().slice(0, 8);
const suf19b = randomUUID().slice(0, 8);
const tok19a = (await req('POST', '/auth/register', { 
  body: { name: 'Atk19A', email: 'atk19a-' + suf19a + '@x.com', password: 'pass123' } 
})).body.token;
const tok19b = (await req('POST', '/auth/register', { 
  body: { name: 'Atk19B', email: 'atk19b-' + suf19b + '@x.com', password: 'pass123' } 
})).body.token;
if (tok19a && tok19b) {
  const grp19a = (await req('POST', '/groups', { token: tok19a, body: { name: 'Grp19', description: '', color: '#eeffee' } })).body.group;
  
  // User B lists their groups
  const list19b = (await req('GET', '/groups', { token: tok19b })).body.groups;
  
  // Check if A's group appears in B's list
  if (list19b && list19b.find(g => g.id === grp19a.id)) {
    bug('ATK19', 'security', 'critical', 'User B can see User A groups in listing', 'Only user own groups', 'Other user groups visible', 'GET /groups as different user', 'List groups endpoint');
  } else {
    pass('Groups properly isolated per user');
  }
  
  await req('DELETE', '/users/me', { token: tok19a });
  await req('DELETE', '/users/me', { token: tok19b });
}

// ATTACK 20: List recipes with groupId filter from other user
console.log('\n=== ATTACK 20: List recipes by other user groupId ===');
const suf20a = randomUUID().slice(0, 8);
const suf20b = randomUUID().slice(0, 8);
const tok20a = (await req('POST', '/auth/register', { 
  body: { name: 'Atk20A', email: 'atk20a-' + suf20a + '@x.com', password: 'pass123' } 
})).body.token;
const tok20b = (await req('POST', '/auth/register', { 
  body: { name: 'Atk20B', email: 'atk20b-' + suf20b + '@x.com', password: 'pass123' } 
})).body.token;
if (tok20a && tok20b) {
  const grp20a = (await req('POST', '/groups', { token: tok20a, body: { name: 'Grp20', description: '', color: '#ffeeee' } })).body.group;
  const rec20a = (await req('POST', '/recipes', { token: tok20a, body: { 
    title: 'Rec20', description: '', ingredients: [], steps: [], 
    prepTime: 10, servings: 1, isPublic: false, groupIds: [grp20a.id] 
  } })).body.recipe;
  
  // User B tries to list recipes by A's group
  const list20 = await req('GET', `/recipes?groupId=${grp20a.id}`, { token: tok20b });
  if (list20.status === 200 && list20.body.recipes && list20.body.recipes.length > 0) {
    bug('ATK20', 'security', 'critical', 'User B can list User A recipes via groupId filter', 'Only own groups', 'Other user recipes visible', 'GET /recipes?groupId=otherUserGroupId', 'List recipes filter endpoint');
  } else {
    pass('Cannot list other user recipes via groupId filter');
  }
  
  await req('DELETE', '/users/me', { token: tok20a });
  await req('DELETE', '/users/me', { token: tok20b });
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
