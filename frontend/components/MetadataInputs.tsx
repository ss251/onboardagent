import { Input } from '@/components/ui/input';
import { Metadata } from '../types/agent';

interface MetadataInputsProps {
  metadata: Metadata;
  handleMetadataChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MetadataInputs: React.FC<MetadataInputsProps> = ({ metadata, handleMetadataChange }) => {
  return (
    <>
      <Input
        name="name"
        value={metadata.name}
        onChange={handleMetadataChange}
        placeholder="Enter NFT name"
      />
      <Input
        name="description"
        value={metadata.description}
        onChange={handleMetadataChange}
        placeholder="Enter NFT description"
      />
      <Input
        name="externalUrl"
        value={metadata.externalUrl}
        onChange={handleMetadataChange}
        placeholder="Enter external URL"
      />
      <Input
        name="attributes"
        value={metadata.attributes.join(',')}
        onChange={handleMetadataChange}
        placeholder="Enter attributes (comma-separated)"
      />
    </>
  );
};