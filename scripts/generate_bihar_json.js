const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'public', 'locations', 'bihar_complete.json');
const outDiv = path.join(__dirname, '..', 'public', 'locations', 'bihar_divisions.json');
const outBlocks = path.join(__dirname, '..', 'public', 'locations', 'bihar_blocks.json');

(async ()=>{
  try{
    const raw = await fs.promises.readFile(src, 'utf8');
    const complete = JSON.parse(raw);

    const divisions = {};
    const blocks = {};

    Object.keys(complete).forEach(parmandal => {
      const districtsObj = complete[parmandal];
      divisions[parmandal] = Object.keys(districtsObj);
      Object.keys(districtsObj).forEach(district => {
        blocks[district] = districtsObj[district];
      });
    });

    await fs.promises.writeFile(outDiv, JSON.stringify(divisions, null, 2), 'utf8');
    await fs.promises.writeFile(outBlocks, JSON.stringify(blocks, null, 2), 'utf8');

    console.log('✅ Created bihar_divisions.json and bihar_blocks.json');
  }catch(err){
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
