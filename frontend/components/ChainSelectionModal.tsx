import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Check } from 'lucide-react';

interface ChainOption {
  chainId: number;
  chainName: string;
}

interface ChainSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  chains: ChainOption[];
  selectedChains: number[];
  onChainSelect: (selectedChains: number[]) => void;
  onSave: (chains: number[]) => void;
}

export const ChainSelectionModal: React.FC<ChainSelectionModalProps> = ({
  isOpen,
  onClose,
  chains,
  selectedChains,
  onChainSelect,
  onSave,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredChains, setFilteredChains] = useState(chains);
  const [tempSelectedChains, setTempSelectedChains] = useState<number[]>(selectedChains);

  useEffect(() => {
    setFilteredChains(
      chains.filter(chain =>
        chain.chainName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, chains]);

  useEffect(() => {
    setTempSelectedChains(selectedChains);
  }, [selectedChains]);

  const handleSelectAll = () => {
    setTempSelectedChains(chains.map(chain => chain.chainId));
  };

  const handleClearAll = () => {
    setTempSelectedChains([]);
  };

  const handleChainSelect = (chainId: number) => {
    setTempSelectedChains(prev => 
      prev.includes(chainId) 
        ? prev.filter(id => id !== chainId)
        : [...prev, chainId]
    );
  };

  const handleSave = () => {
    console.log("Saving chains in modal:", tempSelectedChains);
    onChainSelect(tempSelectedChains);
    onSave(tempSelectedChains);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Chains</DialogTitle>
        </DialogHeader>
        <div className="flex items-center space-x-2 mb-4">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search chains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow"
          />
        </div>
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>Select All</Button>
          <Button variant="outline" size="sm" onClick={handleClearAll}>Clear All</Button>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <div className="grid grid-cols-1 gap-2">
            {filteredChains.map((chain) => (
              <Button
                key={chain.chainId}
                variant="outline"
                size="sm"
                className={`flex items-center justify-between p-2 h-auto transition-colors ${
                  tempSelectedChains.includes(chain.chainId)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary'
                }`}
                onClick={() => handleChainSelect(chain.chainId)}
              >
                <span className="text-sm truncate">{chain.chainName}</span>
                {tempSelectedChains.includes(chain.chainId) && (
                  <Check className="h-4 w-4 ml-2 flex-shrink-0" />
                )}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave}>Save Selection</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};