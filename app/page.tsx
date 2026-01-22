'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import useToolsStore from "./store";
import { PlusIcon } from "lucide-react";
import DatasheetCard from "@/components/datasheets/customDatasheet";
import { runCalculation } from "./lib";
import { defaultDatasheetModifiers, type Datasheet, type DatasheetActions } from "@/components/datasheets/types";
import ModifiersSection from "@/components/calculator/modifiersSection";
import { Card, CardFooter } from "@/components/ui/card/card";
import { useState } from 'react';
import { findDiff } from '@/lib/utils';
import ModifierChip from '@/components/datasheets/modifierChip';
import ResultsCard from '@/components/calculator/resultsCard';


const DatasheetList = ({ datasheets, datasheetActions }: { datasheets: Datasheet[], datasheetActions: DatasheetActions }) => {
  return (
    <motion.div className="flex max-w-full md:max-w-full gap-4 h-fit justify-start flex-col">
      <AnimatePresence mode="sync">
        {datasheets.map(ds => (
          <motion.div
            key={ds.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
            transition={{ type: "tween", duration: 0.1 }}
          >
            <DatasheetCard datasheet={ds} actions={datasheetActions} className='bg-card-surface border-0 shadow-none' />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

const AttackerDefenderCard = ({ title, onAdd, children }: { title: string, onAdd: () => void, children: React.ReactNode }) => {
  return (
    <Card className="flex flex-1 h-fit w-full flex-col gap-4">
      <h2 className=" text-xl font-bold sm:ml-2 self-start sm:items-center flex flex-row">{title}
        <Button className=" hidden md:flex ml-2 border-border border" variant="outline" onClick={onAdd}><PlusIcon /></Button>
      </h2>
      <Button className="sm:ml-2 text-md md:hidden border-border border" variant="secondary" onClick={onAdd}>{`Add ${title}`}<PlusIcon /></Button>
      {children}
    </Card>
  );
}


export default function Calculator() {
  const modifiers = useToolsStore(state => state.modifiers);
  const updateModifiers = useToolsStore(state => state.updateModifiers);
  const datasheets = useToolsStore(state => state.datasheets);
  const attackerIds = useToolsStore(state => state.attackersIds);
  const defenderIds = useToolsStore(state => state.defendersIds);
  const datasheetActions = useToolsStore(state => state.datasheetActions);
  const results = useToolsStore(state => state.results);
  const addDatasheet = useToolsStore(state => state.addDatasheet);
  const addAttacker = useToolsStore(state => state.addAttacker);
  const addDefender = useToolsStore(state => state.addDefender);
  const setResults = useToolsStore(state => state.setResults);

  const [modifiersOpen, setModifiersOpen] = useState(false);

  const handleAddDatasheet = (isAttacker: boolean) => {
    const newId = addDatasheet();
    if (isAttacker) {
      addAttacker(newId);
    } else {
      addDefender(newId);
    }
  };

  const handleCalculate = () => {
    const attacker = datasheets.find(ds => attackerIds.includes(ds.id));
    const defender = datasheets.find(ds => defenderIds.includes(ds.id));
    console.log('Calculating with attackers:', attacker, 'and defenders:', defender);
    if (attacker && defender) {
      const results = runCalculation(datasheets.filter(ds => attackerIds.includes(ds.id)), datasheets.filter(ds => defenderIds.includes(ds.id)), modifiers);
      if (results === null) {
        return;
      }
      setResults(results);
    }
  }

  return (
    <div className="flex flex-col justify-start items-center w-full mx-auto max-w-full xl:max-w-7xl gap-4">
      <Card className='p-0 m-0 w-full h-fit transition-transform duration-200'>
        <div className="items-center justify-start space-x-2 flex flex-row w-full">
          <Button size="2xl" variant="default" className="sm:max-w-48 max-w-lg sm:text p-8" onClick={handleCalculate} disabled={!attackerIds.length || !defenderIds.length}>Calculate</Button>
          <Button size="xl" variant="ghost" className="sm:max-w-48 text-md max-w-lg sm:text" onClick={() => setModifiersOpen(true)}>
            Global Modifiers
          </Button>
          <span className="flex flex-row gap-2 flex-wrap">
            {Object.keys(findDiff(modifiers, defaultDatasheetModifiers)).map((key) => (
              <ModifierChip key={key} modifier={key} value={modifiers[key as keyof typeof modifiers]} variant="default" />
            ))}
          </span>
        </div>
        <ModifiersSection modifiers={modifiers} updateModifiers={updateModifiers} open={modifiersOpen} setOpen={setModifiersOpen} />
      </Card >
      {/* <div className="w-sm sm:w-lg md:w-xl lg:w-full max-w-full flex flex-col gap-4 ">
        <Button size="2xl" variant="default" className="sm:max-w-48 sm:text" onClick={handleCalculate} disabled={!attackerIds.length || !defenderIds.length}>Calculate</Button>
        <Card className="w-sm sm:w-lg min-w-sm md:w-xl flex-wrap lg:w-full max-w-full flex flex-col gap-4 p-2">
          <Separator /> 
          <ModifiersTable modifiers={modifiers} updateModifier={updateMo} />
        </Card>
      </div> */}
      < div className="w-full max-w-full grid grid-cols-1 md:grid-cols-2 gap-4 " >
        <AttackerDefenderCard title="Attackers" onAdd={() => handleAddDatasheet(true)}>
          <DatasheetList datasheets={datasheets.filter(ds => attackerIds.includes(ds.id))} datasheetActions={datasheetActions} />
        </AttackerDefenderCard>

        <AttackerDefenderCard title="Defenders" onAdd={() => handleAddDatasheet(false)}>
          <DatasheetList datasheets={datasheets.filter(ds => defenderIds.includes(ds.id))} datasheetActions={datasheetActions} />
        </AttackerDefenderCard>
        <CardFooter className="flex justify-center">

        </CardFooter>
      </div >
      {
        results && (
          <ResultsCard results={results} />
        )
      }
    </div >
  );
}
