import { useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import type { ConfiguratorGroupWithValues, WizardSelection, ConfigurationState } from "@/types/configurator";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  groups: ConfiguratorGroupWithValues[];
  basePrice: number;
  currencyCode: string;
  productTitle: string;
  onComplete: (state: ConfigurationState) => void;
  initialSelections?: WizardSelection[];
}

function formatPrice(delta: number, currencyCode: string) {
  if (delta === 0) return "0,00 €";
  const formatted = Math.abs(delta).toFixed(2).replace('.', ',');
  return delta > 0 ? `+ ${formatted} €` : `- ${formatted} €`;
}

export function ConfiguratorWizard({ open, onOpenChange, groups, basePrice, currencyCode, productTitle, onComplete, initialSelections }: Props) {
  // Steps: 0=Welcome, 1..N=Groups, N+1=Summary
  const totalSteps = groups.length + 2;
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Map<string, WizardSelection>>(() => {
    const map = new Map<string, WizardSelection>();
    if (initialSelections) {
      initialSelections.forEach(s => map.set(s.groupId, s));
    }
    return map;
  });
  const [showErrors, setShowErrors] = useState(false);

  const getSelection = (groupId: string) => selections.get(groupId);

  const updateSelection = useCallback((groupId: string, sel: WizardSelection) => {
    setSelections(prev => new Map(prev).set(groupId, sel));
  }, []);

  const currentGroup = step >= 1 && step <= groups.length ? groups[step - 1] : null;

  const isCurrentValid = () => {
    if (step === 0 || step === totalSteps - 1) return true;
    if (!currentGroup) return true;
    const sel = getSelection(currentGroup.id);
    if (!currentGroup.is_required) return true;
    if (!sel) return false;
    switch (currentGroup.field_type) {
      case 'text_input': return typeof sel.value === 'string' && sel.value.trim().length > 0;
      case 'dropdown_single': case 'radio': case 'image_single': return !!sel.value;
      case 'dropdown_multi': case 'image_multi': return Array.isArray(sel.value) && sel.value.length > 0;
      case 'checkbox': return true; // checkbox required means must be checked
      default: return true;
    }
  };

  const handleNext = () => {
    if (!isCurrentValid()) { setShowErrors(true); return; }
    setShowErrors(false);
    if (step < totalSteps - 1) setStep(step + 1);
  };

  const handleBack = () => { if (step > 0) { setShowErrors(false); setStep(step - 1); } };

  const totalPriceDelta = Array.from(selections.values()).reduce((sum, s) => sum + s.priceDelta, 0);

  const handleConfirm = () => {
    const state: ConfigurationState = {
      isConfigured: true,
      selections: Array.from(selections.values()),
      totalPriceDelta,
    };
    onComplete(state);
    onOpenChange(false);
  };

  const progressPercent = ((step) / (totalSteps - 1)) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Progress */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Schritt {step + 1} von {totalSteps}</span>
            <span>{productTitle}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[300px]">
          {step === 0 && <WelcomeStep />}
          {currentGroup && (
            <GroupStep
              group={currentGroup}
              selection={getSelection(currentGroup.id)}
              onUpdate={(sel) => updateSelection(currentGroup.id, sel)}
              showError={showErrors && !isCurrentValid()}
            />
          )}
          {step === totalSteps - 1 && (
            <SummaryStep groups={groups} selections={selections} basePrice={basePrice} totalDelta={totalPriceDelta} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <Button variant="outline" onClick={handleBack} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" />Zurück
          </Button>
          {step === totalSteps - 1 ? (
            <Button onClick={handleConfirm} className="bg-primary text-primary-foreground">
              <Check className="h-4 w-4 mr-1" />Bestätigen
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {step === 0 ? 'Start' : 'Weiter'}<ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WelcomeStep() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8">
      <Sparkles className="h-12 w-12 text-primary mb-4" />
      <h2 className="text-2xl font-heading font-bold mb-2">Konfigurieren</h2>
      <p className="text-muted-foreground max-w-sm">
        Beantworte die nächsten Schritte, um dein Produkt individuell zu konfigurieren.
      </p>
    </div>
  );
}

function GroupStep({ group, selection, onUpdate, showError }: {
  group: ConfiguratorGroupWithValues;
  selection: WizardSelection | undefined;
  onUpdate: (sel: WizardSelection) => void;
  showError: boolean;
}) {
  const makeSel = (value: WizardSelection['value'], priceDelta: number): WizardSelection => ({
    groupId: group.id, type: group.field_type, value, priceDelta,
  });

  return (
    <div>
      <h3 className="text-lg font-heading font-semibold mb-1">{group.name}</h3>
      {group.description && <p className="text-sm text-muted-foreground mb-4">{group.description}</p>}

      {group.field_type === 'text_input' && (
        <div>
          <Input
            placeholder="Bitte eingeben…"
            maxLength={120}
            value={typeof selection?.value === 'string' ? selection.value : ''}
            onChange={e => onUpdate(makeSel(e.target.value, 0))}
          />
          <p className="text-xs text-muted-foreground mt-1">{typeof selection?.value === 'string' ? selection.value.length : 0}/120</p>
        </div>
      )}

      {group.field_type === 'dropdown_single' && (
        <Select value={typeof selection?.value === 'string' ? selection.value : ''} onValueChange={v => {
          const val = group.values.find(gv => gv.id === v);
          onUpdate(makeSel(v, val?.price_delta ?? 0));
        }}>
          <SelectTrigger><SelectValue placeholder="Bitte wählen…" /></SelectTrigger>
          <SelectContent>
            {group.values.map(v => (
              <SelectItem key={v.id} value={v.id}>
                {v.name} {v.price_delta !== 0 && `(${formatPrice(v.price_delta, '')})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {group.field_type === 'dropdown_multi' && (
        <div className="space-y-2">
          {group.values.map(v => {
            const selected = Array.isArray(selection?.value) ? selection.value : [];
            const isChecked = selected.includes(v.id);
            return (
              <label key={v.id} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                <Checkbox checked={isChecked} onCheckedChange={c => {
                  const newSel = c ? [...selected, v.id] : selected.filter(id => id !== v.id);
                  const delta = newSel.reduce((sum, id) => sum + (group.values.find(gv => gv.id === id)?.price_delta ?? 0), 0);
                  onUpdate(makeSel(newSel, delta));
                }} />
                <span className="flex-1">{v.name}</span>
                {v.price_delta !== 0 && <span className="text-sm text-muted-foreground">{formatPrice(v.price_delta, '')}</span>}
              </label>
            );
          })}
        </div>
      )}

      {group.field_type === 'radio' && (
        <RadioGroup value={typeof selection?.value === 'string' ? selection.value : ''} onValueChange={v => {
          const val = group.values.find(gv => gv.id === v);
          onUpdate(makeSel(v, val?.price_delta ?? 0));
        }}>
          {group.values.map(v => (
            <label key={v.id} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value={v.id} />
              <span className="flex-1">{v.name}</span>
              {v.description && <span className="text-xs text-muted-foreground">{v.description}</span>}
              {v.price_delta !== 0 && <span className="text-sm text-muted-foreground">{formatPrice(v.price_delta, '')}</span>}
            </label>
          ))}
        </RadioGroup>
      )}

      {(group.field_type === 'image_single') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {group.values.map(v => {
            const isSelected = selection?.value === v.id;
            return (
              <button key={v.id} onClick={() => onUpdate(makeSel(v.id, v.price_delta))}
                className={`rounded-lg border-2 overflow-hidden transition-colors text-left ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}>
                {v.image_url && <img src={v.image_url} alt={v.name} className="w-full aspect-square object-cover" />}
                <div className="p-2">
                  <p className="text-sm font-medium">{v.name}</p>
                  {v.price_delta !== 0 && <p className="text-xs text-muted-foreground">{formatPrice(v.price_delta, '')}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {(group.field_type === 'image_multi') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {group.values.map(v => {
            const selected = Array.isArray(selection?.value) ? selection.value : [];
            const isSelected = selected.includes(v.id);
            return (
              <button key={v.id} onClick={() => {
                const newSel = isSelected ? selected.filter(id => id !== v.id) : [...selected, v.id];
                const delta = newSel.reduce((sum, id) => sum + (group.values.find(gv => gv.id === id)?.price_delta ?? 0), 0);
                onUpdate(makeSel(newSel, delta));
              }}
                className={`rounded-lg border-2 overflow-hidden transition-colors text-left ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}>
                {v.image_url && <img src={v.image_url} alt={v.name} className="w-full aspect-square object-cover" />}
                <div className="p-2">
                  <p className="text-sm font-medium">{v.name}</p>
                  {v.price_delta !== 0 && <p className="text-xs text-muted-foreground">{formatPrice(v.price_delta, '')}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {group.field_type === 'checkbox' && (
        <label className="flex items-center gap-3 p-3 rounded border cursor-pointer hover:bg-muted/50">
          <Checkbox
            checked={selection?.value === true}
            onCheckedChange={c => {
              const delta = c ? (group.values[0]?.price_delta ?? 0) : 0;
              onUpdate(makeSel(!!c, delta));
            }}
          />
          <span className="flex-1 font-medium">{group.values[0]?.name || group.name}</span>
          {group.values[0]?.price_delta !== undefined && group.values[0].price_delta !== 0 && (
            <span className="text-sm text-muted-foreground">{formatPrice(group.values[0].price_delta, '')}</span>
          )}
        </label>
      )}

      {showError && group.is_required && (
        <p className="text-sm text-destructive mt-2">Bitte wähle mindestens eine Option.</p>
      )}
    </div>
  );
}

function SummaryStep({ groups, selections, basePrice, totalDelta }: {
  groups: ConfiguratorGroupWithValues[];
  selections: Map<string, WizardSelection>;
  basePrice: number;
  totalDelta: number;
}) {
  const total = basePrice + totalDelta;

  return (
    <div>
      <h3 className="text-lg font-heading font-semibold mb-4">Zusammenfassung</h3>
      <div className="space-y-3 mb-6">
        {groups.map(g => {
          const sel = selections.get(g.id);
          if (!sel) return (
            <div key={g.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{g.name}</span>
              <span className="text-muted-foreground italic">Keine Auswahl</span>
            </div>
          );

          let displayValue = '';
          let delta = sel.priceDelta;

          if (g.field_type === 'text_input') {
            displayValue = typeof sel.value === 'string' ? sel.value : '';
          } else if (g.field_type === 'checkbox') {
            displayValue = sel.value === true ? 'Ja' : 'Nein';
          } else if (Array.isArray(sel.value)) {
            displayValue = sel.value.map(id => g.values.find(v => v.id === id)?.name || id).join(', ');
          } else if (typeof sel.value === 'string') {
            displayValue = g.values.find(v => v.id === sel.value)?.name || String(sel.value);
          }

          return (
            <div key={g.id} className="flex justify-between text-sm">
              <div>
                <span className="font-medium">{g.name}</span>
                <span className="text-muted-foreground ml-2">{displayValue}</span>
              </div>
              {delta !== 0 && <span className="text-muted-foreground">{formatPrice(delta, '')}</span>}
            </div>
          );
        })}
      </div>
      <div className="border-t pt-4 space-y-1">
        <div className="flex justify-between text-sm"><span>Basispreis</span><span>{basePrice.toFixed(2).replace('.', ',')} €</span></div>
        {totalDelta !== 0 && <div className="flex justify-between text-sm"><span>Aufpreise</span><span>{formatPrice(totalDelta, '')}</span></div>}
        <div className="flex justify-between font-bold text-lg pt-2 border-t">
          <span>Gesamtpreis</span><span>{total.toFixed(2).replace('.', ',')} €</span>
        </div>
      </div>
    </div>
  );
}
